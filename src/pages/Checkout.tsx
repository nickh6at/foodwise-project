import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Flame, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  item: any;
  quantity: number;
}

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isRestaurantOwner, setIsRestaurantOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { cart, restaurant } = location.state || { cart: new Map(), restaurant: null };
  
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) checkUserRole();
  }, [user]);

  useEffect(() => {
    if (!cart || cart.size === 0 || !restaurant) {
      toast.error("No items in cart");
      navigate("/");
    }
  }, [cart, restaurant, navigate]);

  const checkUserRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "restaurant_owner")
      .maybeSingle();
    setIsRestaurantOwner(!!data);
  };

  const getTotalAmount = (): number => {
    return Array.from(cart.values()).reduce<number>(
      (sum, { item, quantity }) => sum + (parseFloat(item.price) * quantity),
      0
    );
  };

  const getTotalCalories = (): number => {
    return Array.from(cart.values()).reduce<number>(
      (sum, { item, quantity }) => sum + (item.calories * quantity),
      0
    );
  };

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      toast.error("Please enter delivery address");
      return;
    }

    setIsLoading(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([{
          customer_id: user.id,
          restaurant_id: restaurant.id,
          delivery_address: deliveryAddress,
          delivery_instructions: deliveryInstructions || null,
          total_amount: getTotalAmount(),
          status: "pending",
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = Array.from(cart.values()).map(({ item, quantity }: CartItem) => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity,
        price_at_time: item.price,
        calories_at_time: item.calories,
        is_healthy_at_time: item.is_healthy,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success("Order placed successfully!");
      navigate("/", { state: { orderPlaced: true } });
    } catch (error: any) {
      console.error("Order error:", error);
      toast.error(error.message || "Failed to place order");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !cart || cart.size === 0 || !restaurant) return null;

  const cartItems = Array.from(cart.values());

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isRestaurantOwner={isRestaurantOwner} />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter your complete delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructions">Delivery Instructions (Optional)</Label>
                  <Textarea
                    id="instructions"
                    placeholder="e.g., Leave at door, Ring bell twice, etc."
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="cursor-pointer flex-1">
                      Cash on Delivery
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="cursor-pointer flex-1">
                      Credit/Debit Card (Simulated)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="upi" id="upi" />
                    <Label htmlFor="upi" className="cursor-pointer flex-1">
                      UPI (Simulated)
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="font-semibold text-sm text-muted-foreground">
                      From: {restaurant.name}
                    </p>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    {cartItems.map(({ item, quantity }: CartItem) => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ₹{parseFloat(item.price).toFixed(2)} × {quantity}
                          </p>
                        </div>
                        <p className="font-semibold text-sm">
                          ₹{(parseFloat(item.price) * quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>₹{getTotalAmount().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Delivery Fee</span>
                      <span>₹0.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Flame className="w-4 h-4" />
                        Total Calories
                      </span>
                      <span className="font-semibold">{getTotalCalories()} cal</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total Amount</span>
                      <span>₹{getTotalAmount().toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handlePlaceOrder}
                    disabled={isLoading}
                  >
                    {isLoading ? "Placing Order..." : "Place Order"}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    By placing this order, you agree to our terms and conditions
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
