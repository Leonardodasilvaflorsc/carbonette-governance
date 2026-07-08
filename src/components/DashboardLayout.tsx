import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Home, BarChart2, FileText, Leaf, Factory, Settings, LogOut, Menu } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const menuItems = [
  { icon: Home, label: 'Dashboard', href: '/' },
  { icon: BarChart2, label: 'Emissions', href: '/emissions' },
  { icon: FileText, label: 'Inventory', href: '/inventory' },
  { icon: Factory, label: 'Planta NH₃', href: '/plant-simulator' },
  { icon: Leaf, label: 'Projects', href: '/projects' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error: any) {
      toast.error('Erro ao sair: ' + error.message);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Mobile Menu Trigger */}
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <SidebarTrigger className="bg-white shadow-md rounded-md">
            <Menu className="h-4 w-4" />
          </SidebarTrigger>
        </div>

        <Sidebar className="border-r border-gray-200 bg-white">
          <SidebarContent className="bg-secondary-100">
            <div className="px-4 py-6 transition-all duration-300 ease-in-out hover:opacity-90">
              <img 
                src="/lovable-uploads/18e53ad3-4ac1-4034-a09d-71f57f4f219c.png" 
                alt="Inctus Logo" 
                className="h-16 w-auto transform transition-transform duration-300 hover:scale-105"
              />
            </div>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item, index) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton asChild>
                        <a 
                          href={item.href} 
                          className="flex items-center gap-3 transition-all duration-200 ease-in-out hover:bg-primary-100 group"
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animation: 'fade-in 0.5s ease-out forwards'
                          }}
                        >
                          <item.icon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary-500" />
                          <span className="transition-colors duration-300 group-hover:text-primary-500">{item.label}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <div className="mt-auto p-4">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all duration-300 ease-in-out transform hover:translate-x-1 group w-full"
              >
                <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                <span>Logout</span>
              </button>
            </div>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-auto pt-16 md:pt-0">
          <div className="container py-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};