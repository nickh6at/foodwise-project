import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, DollarSign, ShoppingBag, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const RestaurantDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/login");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      checkRestaurantOwner();
    }
  }, [user]);

  const checkRestaurantOwner = async () => {
    // Check if user has restaurant_owner role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "restaurant_owner")
      .maybeSingle();

    if (!roleData) {
      toast.error("Access denied. Restaurant owner role required.");
      navigate("/");
      return;
    }

    // Fetch restaurant data
    const { data: restaurantData, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (error || !restaurantData) {
      setRestaurant(null);
      return;
    }

    setRestaurant(restaurantData);
    fetchStats(restaurantData.id);
  };

  const fetchStats = async (restaurantId: string) => {
    // Fetch orders
    const { data: orders } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("restaurant_id", restaurantId);

    // Fetch menu items count
    const { count: menuItemsCount } = await supabase
      .from("menu_items")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);

    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(String(order.total_amount)), 0) || 0;

    setStats({
      totalOrders,
      totalRevenue,
      menuItems: menuItemsCount || 0,
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isRestaurantOwner={true} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            Restaurant Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your restaurant and track performance
          </p>
        </div>

        {restaurant ? (
          <>
            {/* Restaurant Info */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{restaurant.name}</CardTitle>
                <CardDescription>{restaurant.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cuisine Type</p>
                    <p className="font-semibold">{restaurant.cuisine_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <p className="font-semibold">{restaurant.rating.toFixed(1)} ⭐</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Time</p>
                    <p className="font-semibold">{restaurant.delivery_time_minutes} min</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-semibold">{restaurant.is_active ? "Active" : "Inactive"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-8 h-8 text-primary" />
                      <span className="text-3xl font-bold">{stats.totalOrders}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-8 h-8 text-secondary" />
                      <span className="text-3xl font-bold">₹{stats.totalRevenue.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Menu Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-8 h-8 text-accent" />
                      <span className="text-3xl font-bold">{stats.menuItems}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your restaurant efficiently</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground">
                  More features coming soon! You'll be able to manage menu items, view orders, and update restaurant details.
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Restaurant Found</h3>
              <p className="text-muted-foreground mb-6">
                You don't have a restaurant registered yet.
              </p>
              <Button variant="hero">
                Register Your Restaurant
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RestaurantDashboard;
