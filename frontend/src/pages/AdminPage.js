import React, { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import authService from '../services/authService';

// User registration validation schema
const UserSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, '用户名至少3个字符')
    .max(50, '用户名最多50个字符')
    .required('用户名必填'),
  email: Yup.string()
    .email('无效的邮箱格式')
    .required('邮箱必填'),
  password: Yup.string()
    .min(6, '密码至少6个字符')
    .required('密码必填'),
  fullName: Yup.string()
    .max(100, '姓名最多100个字符'),
  role: Yup.string()
    .oneOf(['admin', 'analyst', 'viewer'], '无效的角色')
    .required('角色必填'),
});

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [userCreated, setUserCreated] = useState(false);
  const [error, setError] = useState(null);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCreateUser = async (values, { setSubmitting, resetForm }) => {
    try {
      await authService.registerUser(values);
      setUserCreated(true);
      setError(null);
      resetForm();
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setUserCreated(false);
      }, 5000);
    } catch (err) {
      console.error('Failed to create user:', err);
      setError(err.response?.data?.error || 'Failed to create user. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        管理控制台
      </Typography>
      
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
            <Tab label="用户管理" />
            <Tab label="系统设置" />
            <Tab label="日志查看" />
          </Tabs>
        </Box>
        
        {/* User Management Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                创建新用户
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              {userCreated && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  用户创建成功！
                </Alert>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <Formik
                initialValues={{
                  username: '',
                  email: '',
                  password: '',
                  fullName: '',
                  role: 'viewer',
                }}
                validationSchema={UserSchema}
                onSubmit={handleCreateUser}
              >
                {({ errors, touched, values, handleChange, isSubmitting }) => (
                  <Form>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Field
                          as={TextField}
                          fullWidth
                          id="username"
                          name="username"
                          label="用户名"
                          error={touched.username && Boolean(errors.username)}
                          helperText={touched.username && errors.username}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Field
                          as={TextField}
                          fullWidth
                          id="email"
                          name="email"
                          label="邮箱"
                          error={touched.email && Boolean(errors.email)}
                          helperText={touched.email && errors.email}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Field
                          as={TextField}
                          fullWidth
                          id="password"
                          name="password"
                          label="密码"
                          type="password"
                          error={touched.password && Boolean(errors.password)}
                          helperText={touched.password && errors.password}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Field
                          as={TextField}
                          fullWidth
                          id="fullName"
                          name="fullName"
                          label="姓名"
                          error={touched.fullName && Boolean(errors.fullName)}
                          helperText={touched.fullName && errors.fullName}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel id="role-label">角色</InputLabel>
                          <Select
                            labelId="role-label"
                            id="role"
                            name="role"
                            value={values.role}
                            onChange={handleChange}
                            label="角色"
                          >
                            <MenuItem value="admin">管理员</MenuItem>
                            <MenuItem value="analyst">分析师</MenuItem>
                            <MenuItem value="viewer">查看者</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          disabled={isSubmitting}
                          fullWidth
                        >
                          {isSubmitting ? (
                            <CircularProgress size={24} color="inherit" />
                          ) : (
                            '创建用户'
                          )}
                        </Button>
                      </Grid>
                    </Grid>
                  </Form>
                )}
              </Formik>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                用户角色说明
              </Typography>
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  管理员 (Admin)
                </Typography>
                <Typography variant="body2">
                  拥有系统的全部权限，包括用户管理、系统设置和所有分析功能。
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  分析师 (Analyst)
                </Typography>
                <Typography variant="body2">
                  可以创建和查看所有分析报告，但无法管理用户或修改系统设置。
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  查看者 (Viewer)
                </Typography>
                <Typography variant="body2">
                  只能查看仪表盘和已创建的分析报告，无法创建新的分析。
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* System Settings Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            系统设置
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Typography variant="body1">
            系统设置功能正在开发中...
          </Typography>
        </TabPanel>
        
        {/* Logs Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            系统日志
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Typography variant="body1">
            日志查看功能正在开发中...
          </Typography>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default AdminPage;