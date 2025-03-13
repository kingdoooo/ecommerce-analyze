import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { logout } from '../../redux/slices/authSlice';
import { toggleDarkMode, selectDarkMode } from '../../redux/slices/uiSlice';

const Header = ({ drawerWidth, open, handleDrawerToggle }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const darkMode = useSelector(selectDarkMode);
  const user = useSelector(state => state.auth.user);
  
  const [anchorEl, setAnchorEl] = React.useState(null);
  
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };
  
  const handleProfile = () => {
    handleClose();
    // Navigate to profile page or open profile dialog
  };
  
  const handleThemeToggle = () => {
    dispatch(toggleDarkMode());
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: '100%',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        transition: (theme) => theme.transitions.create(['margin', 'width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        ...(open && {
          transition: (theme) => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }),
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          电商销售分析平台
        </Typography>
        
        {/* Theme toggle */}
        <IconButton color="inherit" onClick={handleThemeToggle}>
          {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
        
        {/* Notifications */}
        <IconButton color="inherit">
          <NotificationsIcon />
        </IconButton>
        
        {/* User menu */}
        <Box sx={{ ml: 2 }}>
          <Tooltip title="账户设置">
            <IconButton onClick={handleMenu} sx={{ p: 0 }}>
              <Avatar alt={user?.username || 'User'} src="/static/images/avatar/1.jpg" />
            </IconButton>
          </Tooltip>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleProfile}>个人资料</MenuItem>
            <MenuItem onClick={handleLogout}>退出登录</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
