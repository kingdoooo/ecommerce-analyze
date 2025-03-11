import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  
  // Create a local copy of streamData with defaults if it's undefined
  const safeStreamData = streamData || { 
    thinking: false, 
    thinkingCollapsed: false, 
    progress: 0, 
    messages: [] 
  };

  // Initial form values
  const initialValues = {
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
    modelId: 'anthropic.claude-3-sonnet-20250219-v1:0',
  };

  // Fetch metadata for form
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const [categoriesData, channelsData, metricsData] = await Promise.all([
          dataService.getCategories(),
          dataService.getChannels(),
          dataService.getMetrics(),
        ]);
        
        setCategories(categoriesData);
        setChannels(channelsData);
        setMetrics(metricsData);
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
        onThinkingProgress: (progress, message) => {
          dispatch(setStreamData({ 
            type: 'thinking_progress', 
            progress, 
            message 
          }));
        },
        onThinkingEnd: (autoCollapse) => {
          dispatch(setStreamData({ 
            type: 'thinking_end', 
            autoCollapse 
          }));
        },
        onResult: (result) => {
          setAnalysisResult(result);
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        创建销售分析
      </Typography>
      
      {error && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light' }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}
      
      <Grid container spacing={3}>
        {/* Analysis Form */}
        <Grid item xs={12} md={streamActive || analysisResult ? 6 : 12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              分析参数配置
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Formik
              initialValues={initialValues}
              validationSchema={AnalysisSchema}
              onSubmit={handleSubmit}
            >
              {({ values, errors, touched, handleChange, setFieldValue, isSubmitting }) => (
                <Form>
                  <Grid container spacing={3}>
                    {/* Time Range */}
                    <Grid item xs={12}>
                      <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardHeader title="时间范围" />
                        <CardContent>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
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
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
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
                    <Grid item xs={12} sm={6}>
                      <FormControl 
                        component="fieldset" 
                        error={touched.dimensions && Boolean(errors.dimensions)}
                        sx={{ width: '100%' }}
                      >
                        <FormLabel component="legend">分析维度</FormLabel>
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
                              />
                            }
                            label="日期"
                          />
                        </FormGroup>
                        {touched.dimensions && errors.dimensions && (
                          <FormHelperText>{errors.dimensions}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    
                    {/* Metrics */}
                    <Grid item xs={12} sm={6}>
                      <FormControl 
                        component="fieldset" 
                        error={touched.metrics && Boolean(errors.metrics)}
                        sx={{ width: '100%' }}
                      >
                        <FormLabel component="legend">分析指标</FormLabel>
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
                                />
                              }
                              label={`${metric.name} - ${metric.description}`}
                            />
                          ))}
                        </FormGroup>
                        {touched.metrics && errors.metrics && (
                          <FormHelperText>{errors.metrics}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    
                    {/* Filters */}
                    <Grid item xs={12}>
                      <Card variant="outlined" sx={{ mb: 2 }}>
                        <CardHeader title="筛选条件" />
                        <CardContent>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth>
                                <InputLabel id="categories-label">产品类别</InputLabel>
                                <Select
                                  labelId="categories-label"
                                  id="filters.categories"
                                  name="filters.categories"
                                  multiple
                                  value={values.filters.categories}
                                  onChange={handleChange}
                                  label="产品类别"
                                >
                                  {categories.filter(c => c.category_level === 1).map((category) => (
                                    <MenuItem key={category.category_id} value={category.category_name}>
                                      {category.category_name}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <FormControl fullWidth>
                                <InputLabel id="channels-label">销售渠道</InputLabel>
                                <Select
                                  labelId="channels-label"
                                  id="filters.channels"
                                  name="filters.channels"
                                  multiple
                                  value={values.filters.channels}
                                  onChange={handleChange}
                                  label="销售渠道"
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
                    
                    {/* Comparison and Model */}
                    <Grid item xs={12}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel id="compare-label">比较周期</InputLabel>
                            <Select
                              labelId="compare-label"
                              id="compareWith"
                              name="compareWith"
                              value={values.compareWith}
                              onChange={handleChange}
                              label="比较周期"
                            >
                              <MenuItem value="previous_period">上一周期</MenuItem>
                              <MenuItem value="previous_year">去年同期</MenuItem>
                              <MenuItem value="">不比较</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth>
                            <InputLabel id="model-label">AI模型</InputLabel>
                            <Select
                              labelId="model-label"
                              id="modelId"
                              name="modelId"
                              value={values.modelId}
                              onChange={handleChange}
                              label="AI模型"
                            >
                              <MenuItem value="anthropic.claude-3-sonnet-20250219-v1:0">Claude 3 Sonnet</MenuItem>
                              <MenuItem value="deepseek.r1-v1:0">DeepSeek R1</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Grid>
                    
                    {/* Submit Button */}
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        size="large"
                        fullWidth
                        disabled={isSubmitting || streamActive}
                      >
                        {isSubmitting || streamActive ? '分析中...' : '开始分析'}
                      </Button>
                    </Grid>
                  </Grid>
                </Form>
              )}
            </Formik>
          </Paper>
        </Grid>
        
        {/* Thinking Process and Results */}
        {(streamActive || analysisResult) && (
          <Grid item xs={12} md={6}>
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
                <Box sx={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {safeStreamData.messages.map((message, index) => (
                    <Typography key={index} variant="body2" gutterBottom>
                      {message}
                    </Typography>
                  ))}
                </Box>
              </Paper>
            )}
            
            {/* Collapsed Thinking */}
            {!safeStreamData.thinking && safeStreamData.thinkingCollapsed && safeStreamData.messages.length > 0 && (
              <Button 
                variant="outlined" 
                onClick={handleToggleThinking}
                sx={{ mb: 2 }}
                fullWidth
              >
                展开思考过程
              </Button>
            )}
            
            {/* Analysis Results */}
            {analysisResult && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  分析结果
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    销售趋势分析
                  </Typography>
                  <Typography variant="body1">
                    {analysisResult.trendAnalysis}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    影响因素
                  </Typography>
                  {analysisResult.causalFactors?.map((factor, index) => (
                    <Box key={index} sx={{ mb: 1 }}>
                      <Typography variant="body1" fontWeight="medium">
                        {factor.factor} (影响程度: {factor.impact})
                      </Typography>
                      <Typography variant="body2">
                        {factor.description}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    关键洞察
                  </Typography>
                  <ul>
                    {analysisResult.keyInsights?.map((insight, index) => (
                      <li key={index}>
                        <Typography variant="body1">{insight}</Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
                
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    行动建议
                  </Typography>
                  <ol>
                    {analysisResult.recommendations?.map((rec, index) => (
                      <li key={index}>
                        <Typography variant="body1">{rec}</Typography>
                      </li>
                    ))}
                  </ol>
                </Box>
              </Paper>
            )}
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default AnalysisPage;
