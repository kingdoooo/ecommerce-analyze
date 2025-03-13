# 电商销售分析平台功能优化总结

本文档总结了对电商销售分析平台的主要优化，包括实现 AWS Bedrock 流式 API 调用和用户界面改进。

## 主要改进

### 1. AWS Bedrock 流式 API 集成

我们实现了 AWS Bedrock 的流式 API 调用，使用本地 AWS 凭证进行身份验证。这带来了以下好处：

- 实时分析结果展示，提升用户体验
- 更高效的服务器资源利用
- 支持长文本生成而不会超时

#### 关键文件修改

- **backend/services/analysisService.js**
  - 添加了 `callBedrockStream` 方法，使用 `ConverseStreamCommand` 实现流式 API 调用
  - 实现了流式响应处理逻辑，包括内容块、元数据和完成事件的处理

- **backend/routes/analysis.js**
  - 更新了 `/stream` 端点，支持流式响应
  - 添加了对 GET 请求的支持，以便 EventSource 连接可以使用查询参数传递令牌和分析参数

- **backend/middleware/auth.js**
  - 修改了 JWT 认证中间件，支持从查询参数中获取令牌
  - 更新了错误消息，使其更加准确

- **frontend/src/services/analysisService.js**
  - 更新了 `streamAnalysis` 方法，通过 URL 查询参数传递令牌和分析参数

### 2. 用户界面改进

我们对用户界面进行了多项改进，提升了用户体验：

- **frontend/src/pages/AnalysisPage.js**
  - 修复了页面滚动问题，确保页面可以正常滚动
  - 添加了固定位置的"开始分析"按钮，确保用户始终可以看到并点击它，无需滚动到页面底部
  - 优化了分析结果展示区域，提供更好的可读性

### 3. 部署流程优化

为了简化部署过程，我们创建了以下部署脚本和文档：

- **deploy-local.sh**: 本地开发环境部署脚本
- **deploy-production.sh**: 生产环境部署脚本
- **LOCAL_DEPLOYMENT.md**: 本地部署指南
- **PRODUCTION_DEPLOYMENT.md**: 生产环境部署指南

## 技术细节

### Bedrock 流式 API 实现

```javascript
async callBedrockStream(prompt, modelId = config.DEFAULT_MODEL_ID, responseCallback) {
  try {
    // 创建 Bedrock 客户端 - 使用本地 AWS 凭证
    const client = new BedrockRuntimeClient({ 
      region: config.AWS_REGION
      // 无需显式提供凭证，SDK 会自动从 ~/.aws/credentials 加载
    });

    // 构建 ConverseStream 请求
    const input = {
      modelId: modelId,
      messages: [
        {
          role: "user",
          content: [
            {
              text: prompt
            }
          ]
        }
      ],
      inferenceConfig: {
        temperature: 0.7,
        maxTokens: 4000
      }
    };

    // 创建并发送命令
    const command = new ConverseStreamCommand(input);
    
    // 处理流式响应
    const response = await client.send(command);
    
    let fullResponse = '';
    let currentMessageContent = '';
    
    // 处理流式响应事件
    for await (const event of response.stream) {
      if (event.contentBlockDelta && event.contentBlockDelta.delta && event.contentBlockDelta.delta.text) {
        const textChunk = event.contentBlockDelta.delta.text;
        fullResponse += textChunk;
        currentMessageContent += textChunk;
        
        // 使用回调通知前端有新内容
        if (responseCallback) {
          responseCallback({
            type: 'content_chunk',
            chunk: textChunk,
            contentSoFar: currentMessageContent
          });
        }
      } else if (event.messageStop) {
        // 消息结束时通知
        if (responseCallback) {
          responseCallback({
            type: 'message_complete',
            stopReason: event.messageStop.stopReason,
            fullContent: fullResponse
          });
        }
      } else if (event.metadata) {
        // 发送元数据信息
        if (responseCallback && event.metadata.usage) {
          responseCallback({
            type: 'metadata',
            usage: event.metadata.usage
          });
        }
      }
    }
    
    // 尝试解析结果为JSON（如果是JSON格式）
    try {
      // 提取JSON部分（假设它在整个响应中）
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return fullResponse;
    } catch (e) {
      console.log('Response is not JSON format, returning raw text');
      return fullResponse;
    }
  } catch (error) {
    console.error('Bedrock Stream API call failed:', error);
    throw new Error(`Failed to invoke Bedrock: ${error.message}`);
  }
}
```

### 认证中间件改进

```javascript
// JWT认证中间件
const authenticateJWT = (req, res, next) => {
  // 尝试从Authorization头获取令牌
  const authHeader = req.headers.authorization;
  
  // 如果头部不存在，检查查询参数
  let token = null;
  if (authHeader) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    // 支持从查询参数中获取令牌
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is missing' });
  }

  try {
    const user = jwt.verify(token, config.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};
```

### 前端流式分析实现

```javascript
// Stream analysis with SSE
streamAnalysis: (params, callbacks) => {
  // 获取JWT令牌
  const token = localStorage.getItem('token');
  
  // 将分析参数序列化为URL查询参数
  const paramsJson = encodeURIComponent(JSON.stringify(params));
  
  // 创建带有令牌和参数的EventSource
  const eventSource = new EventSource(`/api/analysis/stream?token=${token}&params=${paramsJson}`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'thinking_start':
        callbacks.onThinkingStart?.();
        break;
        
      case 'thinking_progress':
        callbacks.onThinkingProgress?.(data.progress, data.message);
        break;
        
      case 'thinking_end':
        callbacks.onThinkingEnd?.(data.autoCollapse);
        break;
        
      case 'analysis_result':
        callbacks.onResult?.(data.result);
        eventSource.close();
        break;
        
      case 'error':
        callbacks.onError?.(data.message);
        eventSource.close();
        break;
        
      default:
        break;
    }
  };
  
  eventSource.onerror = (error) => {
    callbacks.onError?.('Connection error');
    eventSource.close();
  };
  
  return () => {
    eventSource.close();
  };
}
```

## 后续优化建议

1. **缓存机制**：实现分析结果缓存，减少重复分析的API调用
2. **错误恢复**：增强流式API的错误恢复机制，支持断点续传
3. **用户反馈**：添加用户对分析结果的反馈机制，用于改进模型提示
4. **性能监控**：添加API调用性能监控，跟踪响应时间和成功率
5. **多模型支持**：扩展支持更多的Bedrock模型，如Claude 3 Opus和Haiku

## 端口配置

系统使用以下端口配置：

- **后端服务器**: 端口 7001 (通过 `backend/.env` 中的 `PORT=7001` 设置)
- **前端开发服务器**: 端口 3000 (React 默认端口)

这种配置避免了端口冲突，并确保了前端和后端服务器可以同时运行。前端API请求已配置为指向正确的后端端口。

## 总结

通过这些优化，电商销售分析平台现在能够提供更流畅、更实时的分析体验。系统直接利用本地AWS凭证调用Bedrock流式API，简化了认证流程，同时改进的用户界面使得用户可以更方便地使用分析功能。端口配置已优化，确保前端和后端服务器可以正常通信。
