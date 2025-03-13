import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { getAnalysis, selectCurrentAnalysis } from '../redux/slices/analysisSlice';

const ResultsPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const analysis = useSelector(selectCurrentAnalysis);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        await dispatch(getAnalysis(reportId)).unwrap();
        setError(null);
      } catch (err) {
        console.error('Failed to fetch analysis:', err);
        setError('Failed to load analysis results. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [dispatch, reportId]);

  const handleBack = () => {
    navigate('/history');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>
            {error}
          </Typography>
          <Button variant="contained" onClick={handleBack}>
            返回
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!analysis) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography gutterBottom>
            未找到分析报告
          </Typography>
          <Button variant="contained" onClick={handleBack}>
            返回
          </Button>
        </Paper>
      </Container>
    );
  }

  // 渲染Markdown内容
  const renderMarkdownContent = () => {
    // 处理analysisResults是对象且有markdownContent属性的情况
    if (analysis.analysisResults?.markdownContent) {
      // 移除<output>标签
      const cleanedContent = analysis.analysisResults.markdownContent
        .replace(/<output>/, '')
        .replace(/<\/output>$/, '');
        
      return (
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
            {cleanedContent}
          </ReactMarkdown>
        </Box>
      );
    }
    // 处理analysisResults是字符串且包含<output>标签的情况
    else if (typeof analysis.analysisResults === 'string' && analysis.analysisResults.includes('<output>')) {
      // 提取<output>标签中的内容
      const outputMatch = analysis.analysisResults.match(/<output>([\s\S]*?)<\/output>/);
      if (outputMatch) {
        const cleanedContent = outputMatch[1];
        return (
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
              {cleanedContent}
            </ReactMarkdown>
          </Box>
        );
      }
    }
    return null;
  };

  // 渲染结构化内容
  const renderStructuredContent = () => {
    if (!analysis.analysisResults) return null;
    
    return (
      <>
        {/* 执行摘要 */}
        {analysis.analysisResults.executive_summary && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              执行摘要
            </Typography>
            <Typography variant="body1" paragraph>
              {analysis.analysisResults.executive_summary}
            </Typography>
          </Box>
        )}

        {/* 多维度销售分析 */}
        {analysis.analysisResults.multi_dimensional_analysis && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              多维度销售分析
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {/* 销售趋势分析 */}
            {analysis.analysisResults.multi_dimensional_analysis.sales_trends && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  销售趋势分析
                </Typography>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    {analysis.analysisResults.multi_dimensional_analysis.sales_trends.insights && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          数据洞察
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {analysis.analysisResults.multi_dimensional_analysis.sales_trends.insights}
                        </Typography>
                      </>
                    )}
                    
                    {analysis.analysisResults.multi_dimensional_analysis.sales_trends.business_interpretation && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          业务解读
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {analysis.analysisResults.multi_dimensional_analysis.sales_trends.business_interpretation}
                        </Typography>
                      </>
                    )}
                    
                    {analysis.analysisResults.multi_dimensional_analysis.sales_trends.recommendations && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          建议
                        </Typography>
                        <Typography variant="body2">
                          {analysis.analysisResults.multi_dimensional_analysis.sales_trends.recommendations}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
            
            {/* 产品组合分析 */}
            {analysis.analysisResults.multi_dimensional_analysis.product_portfolio && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  产品组合分析
                </Typography>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    {analysis.analysisResults.multi_dimensional_analysis.product_portfolio.insights && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          数据洞察
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {analysis.analysisResults.multi_dimensional_analysis.product_portfolio.insights}
                        </Typography>
                      </>
                    )}
                    
                    {analysis.analysisResults.multi_dimensional_analysis.product_portfolio.business_interpretation && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          业务解读
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {analysis.analysisResults.multi_dimensional_analysis.product_portfolio.business_interpretation}
                        </Typography>
                      </>
                    )}
                    
                    {analysis.analysisResults.multi_dimensional_analysis.product_portfolio.recommendations && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          建议
                        </Typography>
                        <Typography variant="body2">
                          {analysis.analysisResults.multi_dimensional_analysis.product_portfolio.recommendations}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
            
            {/* 渠道表现分析 */}
            {analysis.analysisResults.multi_dimensional_analysis.channel_performance && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  渠道表现分析
                </Typography>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    {analysis.analysisResults.multi_dimensional_analysis.channel_performance.insights && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          数据洞察
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {analysis.analysisResults.multi_dimensional_analysis.channel_performance.insights}
                        </Typography>
                      </>
                    )}
                    
                    {analysis.analysisResults.multi_dimensional_analysis.channel_performance.business_interpretation && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          业务解读
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {analysis.analysisResults.multi_dimensional_analysis.channel_performance.business_interpretation}
                        </Typography>
                      </>
                    )}
                    
                    {analysis.analysisResults.multi_dimensional_analysis.channel_performance.recommendations && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          建议
                        </Typography>
                        <Typography variant="body2">
                          {analysis.analysisResults.multi_dimensional_analysis.channel_performance.recommendations}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        )}
        
        {/* 智能归因分析 */}
        {analysis.analysisResults.attribution_analysis && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              智能归因分析
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {/* 销售波动分析 */}
            {analysis.analysisResults.attribution_analysis.sales_fluctuation_factors && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  销售波动分析
                </Typography>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    {analysis.analysisResults.attribution_analysis.sales_fluctuation_factors.insights && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          数据洞察
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {analysis.analysisResults.attribution_analysis.sales_fluctuation_factors.insights}
                        </Typography>
                      </>
                    )}
                    
                    {analysis.analysisResults.attribution_analysis.sales_fluctuation_factors.business_interpretation && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          业务解读
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {analysis.analysisResults.attribution_analysis.sales_fluctuation_factors.business_interpretation}
                        </Typography>
                      </>
                    )}
                    
                    {analysis.analysisResults.attribution_analysis.sales_fluctuation_factors.recommendations && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          建议
                        </Typography>
                        <Typography variant="body2">
                          {analysis.analysisResults.attribution_analysis.sales_fluctuation_factors.recommendations}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
            
            {/* 多因素相关性分析 */}
            {analysis.analysisResults.attribution_analysis.multi_factor_correlation && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  多因素相关性分析
                </Typography>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    {analysis.analysisResults.attribution_analysis.multi_factor_correlation.insights && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          数据洞察
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {analysis.analysisResults.attribution_analysis.multi_factor_correlation.insights}
                        </Typography>
                      </>
                    )}
                    
                    {analysis.analysisResults.attribution_analysis.multi_factor_correlation.business_interpretation && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          业务解读
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {analysis.analysisResults.attribution_analysis.multi_factor_correlation.business_interpretation}
                        </Typography>
                      </>
                    )}
                    
                    {analysis.analysisResults.attribution_analysis.multi_factor_correlation.recommendations && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          建议
                        </Typography>
                        <Typography variant="body2">
                          {analysis.analysisResults.attribution_analysis.multi_factor_correlation.recommendations}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
            
            {/* 外部因素分析 */}
            {analysis.analysisResults.attribution_analysis.external_factors && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  外部因素分析
                </Typography>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    {analysis.analysisResults.attribution_analysis.external_factors.insights && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          数据洞察
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {analysis.analysisResults.attribution_analysis.external_factors.insights}
                        </Typography>
                      </>
                    )}
                    
                    {analysis.analysisResults.attribution_analysis.external_factors.business_interpretation && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          业务解读
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {analysis.analysisResults.attribution_analysis.external_factors.business_interpretation}
                        </Typography>
                      </>
                    )}
                    
                    {analysis.analysisResults.attribution_analysis.external_factors.recommendations && (
                      <>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          建议
                        </Typography>
                        <Typography variant="body2">
                          {analysis.analysisResults.attribution_analysis.external_factors.recommendations}
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        )}
        
        {/* 关键机会 */}
        {analysis.analysisResults.key_opportunities && (
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              关键机会
            </Typography>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body1">
                  {analysis.analysisResults.key_opportunities}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* 旧格式的分析结果 */}
        {analysis.analysisResults.trendAnalysis && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              趋势分析
            </Typography>
            <Typography variant="body1" paragraph>
              {analysis.analysisResults.trendAnalysis}
            </Typography>
          </Box>
        )}

        {analysis.analysisResults.causalFactors && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              因果因素
            </Typography>
            {Array.isArray(analysis.analysisResults.causalFactors) ? (
              analysis.analysisResults.causalFactors.map((factor, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Typography variant="body1" fontWeight="medium">
                    {factor.factor} (影响程度: {factor.impact})
                  </Typography>
                  <Typography variant="body2">
                    {factor.description}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body1">
                {JSON.stringify(analysis.analysisResults.causalFactors)}
              </Typography>
            )}
          </Box>
        )}

        {analysis.analysisResults.keyInsights && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              关键洞察
            </Typography>
            {Array.isArray(analysis.analysisResults.keyInsights) ? (
              <ul>
                {analysis.analysisResults.keyInsights.map((insight, index) => (
                  <li key={index}>
                    <Typography variant="body1">{insight}</Typography>
                  </li>
                ))}
              </ul>
            ) : (
              <Typography variant="body1">
                {analysis.analysisResults.keyInsights}
              </Typography>
            )}
          </Box>
        )}

        {analysis.analysisResults.recommendations && (
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              建议
            </Typography>
            {Array.isArray(analysis.analysisResults.recommendations) ? (
              <ul>
                {analysis.analysisResults.recommendations.map((recommendation, index) => (
                  <li key={index}>
                    <Typography variant="body1">{recommendation}</Typography>
                  </li>
                ))}
              </ul>
            ) : (
              <Typography variant="body1">
                {analysis.analysisResults.recommendations}
              </Typography>
            )}
          </Box>
        )}
      </>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, maxHeight: '85vh', overflow: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Button variant="outlined" onClick={handleBack} sx={{ mb: 2 }}>
          返回
        </Button>
        <Typography variant="h4" gutterBottom>
          分析报告
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          报告ID: {reportId}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Query Parameters */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              查询参数
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  时间范围
                </Typography>
                <Typography>
                  {analysis.queryParams.timeRange.start} 至 {analysis.queryParams.timeRange.end}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  分析维度
                </Typography>
                <Typography>
                  {analysis.queryParams.dimensions.join(', ')}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" color="text.secondary">
                  分析指标
                </Typography>
                <Typography>
                  {analysis.queryParams.metrics.join(', ')}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Analysis Results */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              分析结果
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {/* 直接显示分析结果 */}
            {analysis.analysisResults ? (
              <div>
                {/* 检查是否有markdown内容或者是包含<output>标签的字符串 */}
                {(analysis.analysisResults.markdownContent || 
                  (typeof analysis.analysisResults === 'string' && analysis.analysisResults.includes('<output>'))) ? 
                  renderMarkdownContent() : 
                  renderStructuredContent()
                }
              </div>
            ) : (
              <Typography variant="body1" color="text.secondary" align="center">
                无分析结果数据
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ResultsPage;
