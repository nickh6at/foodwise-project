import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag, Calendar, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  quantity: number;
  price_at_time: number;
  calories_at_time: number;
  is_healthy_at_time: boolean;
  menu_items: {
    name: string;
    description: string;
  };
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  delivery_address: string;
  delivery_instructions: string | null;
  restaurants: {
    name: string;
    cuisine_type: string;
  };
  order_items: OrderItem[];
}

const MyOrders = () => {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isRestaurantOwner, setIsRestaurantOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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
      fetchOrders();
    }
  }, [user, selectedMonth, selectedYear]);

  const checkUserRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "restaurant_owner")
      .maybeSingle();
    setIsRestaurantOwner(!!data);
  };

  const fetchOrders = async () => {
    setLoading(true);
    
    // Calculate date range for selected month
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        created_at,
        status,
        total_amount,
        delivery_address,
        delivery_instructions,
        restaurants (
          name,
          cuisine_type
        ),
        order_items (
          id,
          quantity,
          price_at_time,
          calories_at_time,
          is_healthy_at_time,
          menu_items (
            name,
            description
          )
        )
      `)
      .eq("customer_id", user.id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "confirmed": return "bg-blue-500";
      case "preparing": return "bg-purple-500";
      case "on_the_way": return "bg-orange-500";
      case "delivered": return "bg-green-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getTotalCalories = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + (item.calories_at_time * item.quantity), 0);
  };

  const getMonthlyStats = () => {
    const totalSpent = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
    const totalCalories = orders.reduce((sum, order) => sum + getTotalCalories(order.order_items), 0);
    const totalOrders = orders.length;
    
    return { totalSpent, totalCalories, totalOrders };
  };

  const stats = getMonthlyStats();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isRestaurantOwner={isRestaurantOwner} />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-primary-glow flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            My Orders
          </h1>
          <p className="text-muted-foreground">
            View your order history and track your monthly intake
          </p>
        </div>

        {/* Month Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Month
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg bg-background"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {format(new Date(2024, i, 1), "MMMM")}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg bg-background"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </CardContent>
        </Card>

        {/* Monthly Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{stats.totalOrders}</span>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Calories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">{stats.totalCalories.toLocaleString()}</span>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">₹{stats.totalSpent.toFixed(2)}</span>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading orders...</p>
              </CardContent>
            </Card>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
                <p className="text-muted-foreground">
                  Start ordering to see your order history!
                </p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {order.restaurants.name}
                        <Badge variant="secondary">{order.restaurants.cuisine_type}</Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(order.created_at), "MMM dd, yyyy 'at' hh:mm a")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {order.delivery_address}
                        </span>
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.menu_items.name}</span>
                            {item.is_healthy_at_time && (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700">
                                Healthy
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity} • {item.calories_at_time * item.quantity} cal
                          </p>
                        </div>
                        <span className="font-semibold">
                          ₹{(item.price_at_time * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Total ({getTotalCalories(order.order_items)} cal)</span>
                      <span>₹{Number(order.total_amount).toFixed(2)}</span>
                    </div>
                    {order.delivery_instructions && (
                      <div className="text-sm text-muted-foreground mt-2">
                        <span className="font-medium">Note:</span> {order.delivery_instructions}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MyOrders;
