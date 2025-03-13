import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
// These imports were causing errors and are not used in the component
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format, subMonths } from 'date-fns';
import { createAnalysis, setStreamData, selectStreamData } from '../redux/slices/analysisSlice';
import dataService from '../services/dataService';
import analysisService from '../services/analysisService';

// Validation schema
const AnalysisSchema = Yup.object().shape({
  timeRange: Yup.object().shape({
    start: Yup.date().required('开始日期必填'),
    end: Yup.date().required('结束日期必填'),
  }),
  dimensions: Yup.array().min(1, '至少选择一个维度'),
  metrics: Yup.array().min(1, '至少选择一个指标'),
});

const AnalysisPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const streamData = useSelector(selectStreamData);
  
  const [categories, setCategories] = useState([]);
  const [channels, setChannels] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [modelConfig, setModelConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const thinkingContainerRef = React.useRef(null);
  
  // Create a local copy of streamData with defaults if it's undefined
  const safeStreamData = streamData || { 
    thinking: false, 
    thinkingCollapsed: false, 
    progress: 0, 
    messages: []
  };

  // Initial form values
  const [formValues, setFormValues] = useState({
    timeRange: {
      start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    },
    dimensions: ['category', 'channel'],
    metrics: ['sales', 'orders'],
    filters: {
      categories: [],
      channels: [],
    },
    compareWith: 'previous_period',
    modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
    enableThinking: false, // 添加Thinking选项，默认关闭
  });

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (thinkingContainerRef.current && safeStreamData.thinking) {
      thinkingContainerRef.current.scrollTop = thinkingContainerRef.current.scrollHeight;
    }
  }, [safeStreamData.messages, safeStreamData.thinking]);

  // Fetch metadata for form
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const [categoriesData, channelsData, metricsData, modelConfigData] = await Promise.all([
          dataService.getCategories(),
          dataService.getChannels(),
          dataService.getMetrics(),
          dataService.getModelConfig(),
        ]);
        
        setCategories(categoriesData);
        setChannels(channelsData);
        setMetrics(metricsData);
        setModelConfig(modelConfigData);
        
        // 如果获取到了模型配置，更新表单的默认值
        if (modelConfigData && modelConfigData.defaultModelId) {
          setFormValues(prevValues => ({
            ...prevValues,
            modelId: modelConfigData.defaultModelId
          }));
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch metadata:', err);
        setError('Failed to load form data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      // Regular API approach
      // const result = await dispatch(createAnalysis(values)).unwrap();
      // navigate(`/analysis/${result.reportId}`);
      
      // Stream approach
      setStreamActive(true);
      dispatch(setStreamData({ type: 'thinking_start' }));
      
      // Start streaming
      const cleanup = analysisService.streamAnalysis(values, {
        onThinkingStart: () => {
          dispatch(setStreamData({ type: 'thinking_start' }));
        },
        onThinkingProgress: (progress, message, isReasoning) => {
          // 检查消息是否来自<output>标签
          const outputMatch = message && message.match(/<output>([\s\S]*?)<\/output>/);
          if (outputMatch) {
            // 如果是<output>标签内容，直接使用标签内的内容
            dispatch(setStreamData({ 
              type: 'thinking_progress', 
              progress, 
              message: outputMatch[1],
              isReasoning: isReasoning || false
            }));
          } else {
            // 否则使用原始消息
            dispatch(setStreamData({ 
              type: 'thinking_progress', 
              progress, 
              message,
              isReasoning: isReasoning || false
            }));
          }
        },
        onThinkingEnd: (autoCollapse) => {
          dispatch(setStreamData({ 
            type: 'thinking_end', 
            autoCollapse
          }));
        },
        onResult: (result) => {
          console.log('Analysis result received:', result);
          
          // 直接使用结果，不再尝试解析JSON
          if (result && result.markdownContent) {
            console.log('Received markdown content:', result.markdownContent);
            // 移除<output>标签
            const cleanedContent = result.markdownContent.replace(/<output>/, '').replace(/<\/output>$/, '');
            setAnalysisResult({
              markdownContent: cleanedContent,
              rawResponse: result.rawResponse || result.markdownContent
            });
          } else if (typeof result === 'string') {
            // 如果结果是字符串，移除<output>标签并作为markdown内容处理
            console.log('Received string result, treating as markdown');
            const cleanedContent = result.replace(/<output>/, '').replace(/<\/output>$/, '');
            setAnalysisResult({
              markdownContent: cleanedContent,
              rawResponse: result
            });
          } else {
            // 如果是其他类型的结果，尝试使用旧的结构化格式
            console.log('Received structured result:', result);
            setAnalysisResult(result);
          }
          
          setStreamActive(false);
        },
        onError: (message) => {
          setError(message);
          setStreamActive(false);
          dispatch(setStreamData({ type: 'thinking_end', autoCollapse: false }));
        }
      });
      
      // Cleanup function for unmounting
      return () => cleanup();
      
    } catch (err) {
      console.error('Analysis creation failed:', err);
      setError('Failed to create analysis. Please try again.');
      setStreamActive(false);
    }
  };

  // Toggle thinking collapse
  const handleToggleThinking = () => {
    dispatch(setStreamData({ type: 'toggle_thinking_collapse' }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, pb: 8 }}>
      <Typography variant="h4" gutterBottom align="center">
        创建销售分析
      </Typography>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}
      
      <Grid container direction="column" spacing={3}>
        {/* Analysis Form - Always at the top */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              分析参数配置
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Formik
              initialValues={formValues}
              validationSchema={AnalysisSchema}
              onSubmit={handleSubmit}
            >
              {({ values, errors, touched, handleChange, setFieldValue, isSubmitting }) => (
                <Form>
                  <Grid container spacing={2}>
                    {/* All parameters in one row with appropriate spacing */}
                    <Grid item xs={12} md={2}>
                      {/* Time Range */}
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardHeader title="时间范围" sx={{ pb: 0 }} />
                        <CardContent>
                          <Grid container spacing={1}>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                size="small"
                                id="timeRange.start"
                                name="timeRange.start"
                                label="开始日期"
                                type="date"
                                value={values.timeRange.start}
                                onChange={handleChange}
                                error={touched.timeRange?.start && Boolean(errors.timeRange?.start)}
                                helperText={touched.timeRange?.start && errors.timeRange?.start}
                                InputLabelProps={{ shrink: true }}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                size="small"
                                id="timeRange.end"
                                name="timeRange.end"
                                label="结束日期"
                                type="date"
                                value={values.timeRange.end}
                                onChange={handleChange}
                                error={touched.timeRange?.end && Boolean(errors.timeRange?.end)}
                                helperText={touched.timeRange?.end && errors.timeRange?.end}
                                InputLabelProps={{ shrink: true }}
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    {/* Dimensions */}
                    <Grid item xs={12} md={2}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardHeader title="分析维度" sx={{ pb: 0 }} />
                        <CardContent>
                          <FormControl 
                            component="fieldset" 
                            error={touched.dimensions && Boolean(errors.dimensions)}
                            sx={{ width: '100%' }}
                            size="small"
                          >
                            <FormGroup>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={values.dimensions.includes('category')}
                                    onChange={(e) => {
                                      const newDimensions = e.target.checked
                                        ? [...values.dimensions, 'category']
                                        : values.dimensions.filter(d => d !== 'category');
                                      setFieldValue('dimensions', newDimensions);
                                    }}
                                    name="dimensions"
                                    value="category"
                                    size="small"
                                  />
                                }
                                label="产品类别"
                              />
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={values.dimensions.includes('channel')}
                                    onChange={(e) => {
                                      const newDimensions = e.target.checked
                                        ? [...values.dimensions, 'channel']
                                        : values.dimensions.filter(d => d !== 'channel');
                                      setFieldValue('dimensions', newDimensions);
                                    }}
                                    name="dimensions"
                                    value="channel"
                                    size="small"
                                  />
                                }
                                label="销售渠道"
                              />
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={values.dimensions.includes('date')}
                                    onChange={(e) => {
                                      const newDimensions = e.target.checked
                                        ? [...values.dimensions, 'date']
                                        : values.dimensions.filter(d => d !== 'date');
                                      setFieldValue('dimensions', newDimensions);
                                    }}
                                    name="dimensions"
                                    value="date"
                                    size="small"
                                  />
                                }
                                label="日期"
                              />
                            </FormGroup>
                            {touched.dimensions && errors.dimensions && (
                              <FormHelperText>{errors.dimensions}</FormHelperText>
                            )}
                          </FormControl>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    {/* Metrics */}
                    <Grid item xs={12} md={2}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardHeader title="分析指标" sx={{ pb: 0 }} />
                        <CardContent>
                          <FormControl 
                            component="fieldset" 
                            error={touched.metrics && Boolean(errors.metrics)}
                            sx={{ width: '100%' }}
                            size="small"
                          >
                            <FormGroup>
                              {metrics.map((metric) => (
                                <FormControlLabel
                                  key={metric.id}
                                  control={
                                    <Checkbox
                                      checked={values.metrics.includes(metric.id)}
                                      onChange={(e) => {
                                        const newMetrics = e.target.checked
                                          ? [...values.metrics, metric.id]
                                          : values.metrics.filter(m => m !== metric.id);
                                        setFieldValue('metrics', newMetrics);
                                      }}
                                      name="metrics"
                                      value={metric.id}
                                      size="small"
                                    />
                                  }
                                  label={`${metric.name}`}
                                />
                              ))}
                            </FormGroup>
                            {touched.metrics && errors.metrics && (
                              <FormHelperText>{errors.metrics}</FormHelperText>
                            )}
                          </FormControl>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    {/* Filters */}
                    <Grid item xs={12} md={2}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardHeader title="筛选条件" sx={{ pb: 0 }} />
                        <CardContent>
                          <Grid container spacing={1}>
                            <Grid item xs={12}>
                              <FormControl fullWidth size="small">
                                <InputLabel id="categories-label">产品类别</InputLabel>
                                <Select
                                  labelId="categories-label"
                                  id="filters.categories"
                                  name="filters.categories"
                                  multiple
                                  value={values.filters.categories}
                                  onChange={handleChange}
                                  label="产品类别"
                                  size="small"
                                >
                                  {categories.filter(c => c.category_level === 1).map((category) => (
                                    <MenuItem key={category.category_id} value={category.category_name}>
                                      {category.category_name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                              <FormControl fullWidth size="small">
                                <InputLabel id="channels-label">销售渠道</InputLabel>
                                <Select
                                  labelId="channels-label"
                                  id="filters.channels"
                                  name="filters.channels"
                                  multiple
                                  value={values.filters.channels}
                                  onChange={handleChange}
                                  label="销售渠道"
                                  size="small"
                                >
                                  {channels.map((channel) => (
                                    <MenuItem key={channel} value={channel}>
                                      {channel}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    {/* Comparison and Model - Stacked vertically */}
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardHeader title="其他设置" sx={{ pb: 0 }} />
                        <CardContent>
                          <Grid container spacing={1}>
                            <Grid item xs={12} md={6}>
                              <FormControl fullWidth size="small">
                                <InputLabel id="compare-label">比较周期</InputLabel>
                                <Select
                                  labelId="compare-label"
                                  id="compareWith"
                                  name="compareWith"
                                  value={values.compareWith}
                                  onChange={handleChange}
                                  label="比较周期"
                                  size="small"
                                >
                                  <MenuItem value="previous_period">上一周期</MenuItem>
                                  <MenuItem value="previous_year">去年同期</MenuItem>
                                  <MenuItem value="">不比较</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <FormControl fullWidth size="small">
                                <InputLabel id="model-label">AI模型</InputLabel>
                                <Select
                                  labelId="model-label"
                                  id="modelId"
                                  name="modelId"
                                  value={values.modelId}
                                  onChange={(e) => {
                                    // 处理模型变更
                                    const newModelId = e.target.value;
                                    handleChange(e);
                                    
                                    // 如果是Claude模型，保持enableThinking的当前值
                                    // 如果不是Claude模型，禁用enableThinking选项
                                    const isClaudeModel = newModelId.includes('claude');
                                    if (!isClaudeModel) {
                                      setFieldValue('enableThinking', false);
                                    }
                                  }}
                                  label="AI模型"
                                  size="small"
                                >
                                  {modelConfig && modelConfig.models ? (
                                    modelConfig.models.map((model) => (
                                      <MenuItem key={model.id} value={model.id}>
                                        {model.name}
                                      </MenuItem>
                                    ))
                                  ) : (
                                    <>
                                      <MenuItem value="us.anthropic.claude-3-7-sonnet-20250219-v1:0">Claude 3.7 Sonnet</MenuItem>
                                      <MenuItem value="deepseek.r1-v1:0">DeepSeek R1</MenuItem>
                                    </>
                                  )}
                                </Select>
                              </FormControl>
                            </Grid>
                            
                            {/* Thinking选项，仅在选择Claude模型时显示 */}
                            {values.modelId.includes('claude') && (
                              <Grid item xs={12}>
                                <FormControl component="fieldset">
                                  <FormControlLabel
                                    control={
                                      <Checkbox
                                        checked={values.enableThinking}
                                        onChange={(e) => {
                                          setFieldValue('enableThinking', e.target.checked);
                                        }}
                                        name="enableThinking"
                                      />
                                    }
                                    label="启用思考过程"
                                  />
                                </FormControl>
                              </Grid>
                            )}
                            <Grid item xs={12}>
                              <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                size="medium"
                                fullWidth
                                disabled={isSubmitting || streamActive}
                              >
                                {isSubmitting || streamActive ? '分析中...' : '开始分析'}
                              </Button>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    {/* No duplicate submit button needed as it's already in the "其他设置" card */}
                  </Grid>
                </Form>
              )}
            </Formik>
          </Paper>
          
          {/* Fixed Submit Button - Always visible */}
          <Formik
            initialValues={formValues}
            validationSchema={AnalysisSchema}
            onSubmit={handleSubmit}
            enableReinitialize={true}
          >
            {({ isSubmitting }) => (
              <Box 
                sx={{ 
                  position: 'fixed', 
                  bottom: '20px', 
                  right: '20px', 
                  zIndex: 100 
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={isSubmitting || streamActive}
                  sx={{ 
                    boxShadow: 3,
                    borderRadius: '28px',
                    px: 4
                  }}
                >
                  {isSubmitting || streamActive ? '分析中...' : '开始分析'}
                </Button>
              </Box>
            )}
          </Formik>
        </Grid>
        
        {/* Thinking Process and Results - Always at the bottom, full width */}
        {(streamActive || analysisResult) && (
          <Grid item xs={12}>
            {/* Thinking Process */}
            {safeStreamData.thinking && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">分析思考过程</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={safeStreamData.progress} 
                  sx={{ mb: 2 }}
                />
                <Box 
                  sx={{ height: '300px', overflowY: 'auto', width: '100%' }}
                  id="thinking-process-container"
                  ref={thinkingContainerRef}
                >
                  {safeStreamData.messages.map((message, index) => (
                    <Typography key={index} variant="body2" gutterBottom sx={{ width: '100%', wordBreak: 'break-word' }}>
                      {message}
                    </Typography>
                  ))}
                </Box>
              </Paper>
            )}
            
            {/* Collapsed Thinking - 已深度思考折叠面板，只在有reasoning内容时显示 */}
            {!safeStreamData.thinking && safeStreamData.messages.length > 0 && safeStreamData.hasReasoningContent && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={handleToggleThinking}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {safeStreamData.thinkingCollapsed ? (
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '8px' }}>▶</span> 
                        已深度思考
                      </Typography>
                    ) : (
                      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: '8px' }}>▼</span> 
                        已深度思考
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex' }}>
                    <Button 
                      size="small" 
                      variant="text" 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(safeStreamData.messages.join('\n'));
                      }}
                    >
                      复制
                    </Button>
                  </Box>
                </Box>
                
                {/* 展开后显示思考内容 */}
                {!safeStreamData.thinkingCollapsed && (
                  <Box 
                    sx={{ 
                      mt: 2, 
                      p: 2, 
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                      borderRadius: 1,
                      maxHeight: '300px',
                      overflowY: 'auto'
                    }}
                  >
                    {safeStreamData.messages.map((message, index) => (
                      <Typography key={index} variant="body2" paragraph>
                        {message}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Paper>
            )}
            
            {/* Analysis Results */}
            {analysisResult && (
              <Paper sx={{ p: 3, maxHeight: 'none', overflow: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  分析结果
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {/* 如果有markdown内容，直接渲染markdown */}
                {analysisResult.markdownContent ? (
                  <Box sx={{ 
                    '& h2': { 
                      fontSize: '1.5rem', 
                      fontWeight: 'bold',
                      mt: 3,
                      mb: 2 
                    },
                    '& h3': { 
                      fontSize: '1.2rem', 
                      fontWeight: 'bold',
                      mt: 2,
                      mb: 1 
                    },
                    '& ul, & ol': { 
                      pl: 3,
                      mb: 2
                    },
                    '& li': { 
                      mb: 0.5 
                    },
                    '& p': { 
                      mb: 1.5 
                    }
                  }}>
                    <ReactMarkdown>
                      {analysisResult.markdownContent}
                    </ReactMarkdown>
                  </Box>
                ) : (
                  // 旧的结构化显示方式
                  <>
                    {/* 执行摘要 */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        执行摘要
                      </Typography>
                      <Typography variant="body1">
                        {analysisResult.executive_summary}
                      </Typography>
                    </Box>
                    
                    {/* 多维度分析 */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        多维度销售分析
                      </Typography>
                      
                      {/* 销售趋势 */}
                      <Box sx={{ mb: 2, pl: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          销售趋势分析
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            数据洞察
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {analysisResult.multi_dimensional_analysis?.sales_trends?.insights}
                          </Typography>
                          
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            业务解读
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {analysisResult.multi_dimensional_analysis?.sales_trends?.business_interpretation}
                          </Typography>
                          
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            建议
                          </Typography>
                          <Typography variant="body1">
                            {analysisResult.multi_dimensional_analysis?.sales_trends?.recommendations}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* 产品组合 */}
                      <Box sx={{ mb: 2, pl: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          产品组合分析
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            数据洞察
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {analysisResult.multi_dimensional_analysis?.product_portfolio?.insights}
                          </Typography>
                          
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            业务解读
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {analysisResult.multi_dimensional_analysis?.product_portfolio?.business_interpretation}
                          </Typography>
                          
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            建议
                          </Typography>
                          <Typography variant="body1">
                            {analysisResult.multi_dimensional_analysis?.product_portfolio?.recommendations}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* 渠道表现 */}
                      <Box sx={{ mb: 2, pl: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          渠道表现分析
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            数据洞察
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {analysisResult.multi_dimensional_analysis?.channel_performance?.insights}
                          </Typography>
                          
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            业务解读
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {analysisResult.multi_dimensional_analysis?.channel_performance?.business_interpretation}
                          </Typography>
                          
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            建议
                          </Typography>
                          <Typography variant="body1">
                            {analysisResult.multi_dimensional_analysis?.channel_performance?.recommendations}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    {/* 智能归因分析 */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        智能归因分析
                      </Typography>
                      
                      {/* 销售波动因素 */}
                      <Box sx={{ mb: 2, pl: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          销售波动分析
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            数据洞察
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {analysisResult.attribution_analysis?.sales_fluctuation_factors?.insights}
                          </Typography>
                          
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            业务解读
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {analysisResult.attribution_analysis?.sales_fluctuation_factors?.business_interpretation}
                          </Typography>
                          
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            建议
                          </Typography>
                          <Typography variant="body1">
                            {analysisResult.attribution_analysis?.sales_fluctuation_factors?.recommendations}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* 多因素相关性 */}
                      <Box sx={{ mb: 2, pl: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          多因素相关性分析
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            数据洞察
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {analysisResult.attribution_analysis?.multi_factor_correlation?.insights}
                          </Typography>
                          
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            业务解读
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {analysisResult.attribution_analysis?.multi_factor_correlation?.business_interpretation}
                          </Typography>
                          
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            建议
                          </Typography>
                          <Typography variant="body1">
                            {analysisResult.attribution_analysis?.multi_factor_correlation?.recommendations}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* 外部因素 */}
                      <Box sx={{ mb: 2, pl: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          外部因素分析
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            数据洞察
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {analysisResult.attribution_analysis?.external_factors?.insights}
                          </Typography>
                          
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            业务解读
                          </Typography>
                          <Typography variant="body1" sx={{ mb: 1 }}>
                            {analysisResult.attribution_analysis?.external_factors?.business_interpretation}
                          </Typography>
                          
                          <Typography variant="body2" fontWeight="medium" color="text.secondary">
                            建议
                          </Typography>
                          <Typography variant="body1">
                            {analysisResult.attribution_analysis?.external_factors?.recommendations}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    {/* 关键机会 */}
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        关键机会
                      </Typography>
                      <Typography variant="body1">
                        {analysisResult.key_opportunities}
                      </Typography>
                    </Box>
                  </>
                )}
              </Paper>
            )}
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default AnalysisPage;
