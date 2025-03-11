import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
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
    navigate('/analysis');
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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

            {/* Trend Analysis */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                销售趋势分析
              </Typography>
              <Typography variant="body1" paragraph>
                {analysis.analysisResults.trendAnalysis}
              </Typography>
            </Box>

            {/* Causal Factors */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                影响因素分析
              </Typography>
              <Grid container spacing={2}>
                {analysis.analysisResults.causalFactors.map((factor, index) => (
                  <Grid item xs={12} md={4} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          {factor.factor}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          影响程度: {factor.impact}
                        </Typography>
                        <Typography variant="body2">
                          {factor.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Key Insights */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                关键洞察
              </Typography>
              <Grid container spacing={2}>
                {analysis.analysisResults.keyInsights.map((insight, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="body1">
                          {insight}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Recommendations */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                行动建议
              </Typography>
              <Grid container spacing={2}>
                {analysis.analysisResults.recommendations.map((recommendation, index) => (
                  <Grid item xs={12} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="body1">
                          {index + 1}. {recommendation}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ResultsPage;