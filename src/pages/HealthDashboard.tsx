import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, TrendingUp, Flame, Leaf } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const HealthDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [isRestaurantOwner, setIsRestaurantOwner] = useState(false);
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
      checkUserRole();
      fetchHealthData();
    }
  }, [user]);

  const checkUserRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "restaurant_owner")
      .maybeSingle();
    setIsRestaurantOwner(!!data);
  };

  const fetchHealthData = async () => {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch orders from last 30 days
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        created_at,
        order_items (
          calories_at_time,
          is_healthy_at_time,
          price_at_time,
          quantity
        )
      `)
      .eq("customer_id", user.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
      return;
    }

    // Calculate statistics
    let totalCalories = 0;
    let healthySpending = 0;
    let junkSpending = 0;
    let healthyOrders = 0;
    let junkOrders = 0;

    orders?.forEach((order: any) => {
      order.order_items?.forEach((item: any) => {
        const itemTotal = item.price_at_time * item.quantity;
        totalCalories += item.calories_at_time * item.quantity;
        
        if (item.is_healthy_at_time) {
          healthySpending += itemTotal;
          healthyOrders++;
        } else {
          junkSpending += itemTotal;
          junkOrders++;
        }
      });
    });

    const totalSpending = healthySpending + junkSpending;
    const healthyPercentage = totalSpending > 0 ? (healthySpending / totalSpending) * 100 : 0;
    const junkPercentage = totalSpending > 0 ? (junkSpending / totalSpending) * 100 : 0;

    setHealthData({
      totalCalories,
      healthySpending,
      junkSpending,
      totalSpending,
      healthyPercentage,
      junkPercentage,
      healthyOrders,
      junkOrders,
      totalOrders: orders?.length || 0,
    });
  };

  const getRecommendation = () => {
    if (!healthData) return "";
    
    if (healthData.junkPercentage > 60) {
      return "Your recent orders have been high in calories. Consider exploring our 'Fresh & Fit' collection for healthier options! 🥗";
    } else if (healthData.healthyPercentage > 60) {
      return "Great job! You're making healthy choices. Keep up the good work! 🌟";
    } else {
      return "You have a balanced diet! Continue making informed choices. 👍";
    }
  };

  const pieData = healthData ? [
    { name: "Healthy", value: healthData.healthyPercentage, color: "hsl(158, 64%, 52%)" },
    { name: "Junk", value: healthData.junkPercentage, color: "hsl(0, 84%, 60%)" },
  ] : [];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isRestaurantOwner={isRestaurantOwner} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-health-primary to-health-secondary flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            Your Health Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track your nutritional choices over the last 30 days
          </p>
        </div>

        {healthData && healthData.totalOrders > 0 ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <span className="text-3xl font-bold">{healthData.totalOrders}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Calories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Flame className="w-8 h-8 text-secondary" />
                    <span className="text-3xl font-bold">{healthData.totalCalories.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Healthy Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Leaf className="w-8 h-8 text-primary" />
                    <span className="text-3xl font-bold">{healthData.healthyOrders}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Spending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">₹{healthData.totalSpending.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Recommendations */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Spending by Food Type</CardTitle>
                  <CardDescription>
                    Your spending split between healthy and junk food
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Healthy Spending</p>
                      <p className="text-2xl font-bold text-primary">₹{healthData.healthySpending.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-3 bg-accent/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Junk Spending</p>
                      <p className="text-2xl font-bold text-accent">₹{healthData.junkSpending.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-health-primary/10 to-health-secondary/10">
                <CardHeader>
                  <CardTitle>Smart Recommendations</CardTitle>
                  <CardDescription>
                    Personalized suggestions based on your ordering history
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-background rounded-lg border-2 border-primary/20">
                    <p className="text-lg">{getRecommendation()}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold">Quick Tips:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Leaf className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                        <span>Look for items marked as "Healthy" when ordering</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Flame className="w-4 h-4 mt-0.5 text-secondary flex-shrink-0" />
                        <span>Check calorie counts to make informed decisions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Heart className="w-4 h-4 mt-0.5 text-accent flex-shrink-0" />
                        <span>Balance your meals with a mix of nutrients</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Order History Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start ordering to see your personalized health insights!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default HealthDashboard;
