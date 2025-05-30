import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, User, LogOut, CreditCard, Shield, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'brand': return 'Brand Manager';
      case 'creator': return 'Content Creator';
      case 'agency': return 'Agency';
      case 'admin': return 'Admin';
      default: return 'User';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'brand': return 'text-blue-600';
      case 'creator': return 'text-purple-600';
      case 'agency': return 'text-green-600';
      case 'admin': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!isAuthenticated) {
    return (
      <nav className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/">
            <h1 className="text-2xl font-bold text-[#222222]">InfluencerFlow</h1>
          </Link>
          <div className="flex items-center space-x-4">
            <Link to="/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link to="/dashboard">
            <h1 className="text-2xl font-bold text-[#222222]">InfluencerFlow</h1>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              to="/dashboard" 
              className={`transition-colors ${
                isActive('/dashboard') 
                  ? 'text-[#FFE600] font-semibold' 
                  : 'text-[#222222] hover:text-[#FFE600]'
              }`}
            >
              Dashboard
            </Link>
            <Link 
              to="/creators" 
              className={`transition-colors ${
                isActive('/creators') 
                  ? 'text-[#FFE600] font-semibold' 
                  : 'text-[#222222] hover:text-[#FFE600]'
              }`}
            >
              Creators
            </Link>
            <Link 
              to="/campaigns" 
              className={`transition-colors ${
                isActive('/campaigns') 
                  ? 'text-[#FFE600] font-semibold' 
                  : 'text-[#222222] hover:text-[#FFE600]'
              }`}
            >
              Campaigns
            </Link>
            <Link 
              to="/outreach" 
              className={`transition-colors ${
                isActive('/outreach') 
                  ? 'text-[#FFE600] font-semibold' 
                  : 'text-[#222222] hover:text-[#FFE600]'
              }`}
            >
              Outreach
            </Link>
            <Link 
              to="/analytics" 
              className={`transition-colors ${
                isActive('/analytics') 
                  ? 'text-[#FFE600] font-semibold' 
                  : 'text-[#222222] hover:text-[#FFE600]'
              }`}
            >
              Analytics
            </Link>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-[#FFE600] text-black">
                    {user?.name ? getUserInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <p className={`text-xs font-medium ${getRoleColor(user?.role || '')}`}>
                    {getRoleDisplayName(user?.role || '')}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="w-full cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="w-full cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              {user?.role === 'admin' && (
                <DropdownMenuItem>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Admin Panel</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
