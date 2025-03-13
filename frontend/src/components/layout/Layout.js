import React from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import { selectSidebarOpen, setSidebarOpen } from '../../redux/slices/uiSlice';

// Sidebar width
const drawerWidth = 240;

const Layout = () => {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector(selectSidebarOpen);

  const handleDrawerToggle = () => {
    dispatch(setSidebarOpen(!sidebarOpen));
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Header */}
      <Header 
        drawerWidth={drawerWidth} 
        open={sidebarOpen} 
        handleDrawerToggle={handleDrawerToggle} 
      />
      
      {/* Sidebar */}
      <Sidebar 
        drawerWidth={drawerWidth} 
        open={sidebarOpen} 
        handleDrawerToggle={handleDrawerToggle} 
      />
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          marginLeft: 0, // 移除左侧边距，让内容居中
          height: '100vh', // 设置高度为100vh
          overflow: 'auto', // 添加滚动条
          transition: (theme) => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(sidebarOpen && {
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            // 不添加左侧边距，让内容在展示区域居中
            transition: (theme) => theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
        }}
      >
        <Toolbar /> {/* Add space for fixed header */}
        <Outlet /> {/* Render child routes */}
      </Box>
    </Box>
  );
};

export default Layout;
