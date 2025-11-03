import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Star, Plus, Minus, ShoppingCart, Leaf, Flame } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import restaurantPlaceholder from "@/assets/restaurant-placeholder.png";

const Restaurant = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<Map<string, { item: any; quantity: number }>>(new Map());
  const [isRestaurantOwner, setIsRestaurantOwner] = useState(false);

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
    if (user && id) {
      checkUserRole();
      fetchRestaurant();
      fetchMenuItems();
    }
  }, [user, id]);

  const checkUserRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "restaurant_owner")
      .maybeSingle();
    setIsRestaurantOwner(!!data);
  };

  const fetchRestaurant = async () => {
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Restaurant not found");
      navigate("/");
      return;
    }

    setRestaurant(data);
  };

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", id)
      .eq("is_available", true)
      .order("category");

    if (error) {
      toast.error("Failed to load menu");
      return;
    }

    setMenuItems(data || []);
  };

  const addToCart = (item: any) => {
    const newCart = new Map(cart);
    const existing = newCart.get(item.id);
    if (existing) {
      newCart.set(item.id, { item, quantity: existing.quantity + 1 });
    } else {
      newCart.set(item.id, { item, quantity: 1 });
    }
    setCart(newCart);
    toast.success(`Added ${item.name} to cart`);
  };

  const updateQuantity = (itemId: string, change: number) => {
    const newCart = new Map(cart);
    const existing = newCart.get(itemId);
    if (existing) {
      const newQuantity = existing.quantity + change;
      if (newQuantity <= 0) {
        newCart.delete(itemId);
      } else {
        newCart.set(itemId, { ...existing, quantity: newQuantity });
      }
      setCart(newCart);
    }
  };

  const getTotalAmount = () => {
    return Array.from(cart.values()).reduce(
      (sum, { item, quantity }) => sum + item.price * quantity,
      0
    );
  };

  const getTotalCalories = () => {
    return Array.from(cart.values()).reduce(
      (sum, { item, quantity }) => sum + item.calories * quantity,
      0
    );
  };

  const handleCheckout = () => {
    if (cart.size === 0) {
      toast.error("Your cart is empty");
      return;
    }
    navigate("/checkout", { state: { cart, restaurant } });
  };

  const groupedItems: Record<string, any[]> = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  if (!user || !restaurant) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isRestaurantOwner={isRestaurantOwner} />

      {/* Restaurant Header */}
      <div className="relative h-[300px] overflow-hidden">
        <img
          src={restaurant.image_url || restaurantPlaceholder}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="container mx-auto">
            <h1 className="text-4xl font-bold text-white mb-2">{restaurant.name}</h1>
            <p className="text-white/90 mb-4">{restaurant.description}</p>
            <div className="flex items-center gap-4 text-white">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {restaurant.cuisine_type}
              </Badge>
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span>{restaurant.rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-5 h-5" />
                <span>{restaurant.delivery_time_minutes} min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="mb-8">
                <h2 className="text-2xl font-bold mb-4 capitalize">{category}</h2>
                <div className="space-y-4">
                  {items.map((item: any) => (
                    <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{item.name}</h3>
                              {item.is_healthy && (
                                <Badge variant="outline" className="text-primary border-primary">
                                  <Leaf className="w-3 h-3 mr-1" />
                                  Healthy
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-semibold text-primary">₹{item.price}</span>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Flame className="w-4 h-4" />
                                <span>{item.calories} cal</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {cart.has(item.id) ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => updateQuantity(item.id, -1)}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-8 text-center font-semibold">
                                  {cart.get(item.id)?.quantity}
                                </span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => updateQuantity(item.id, 1)}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button onClick={() => addToCart(item)} size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Cart Sidebar (Desktop) */}
          <div className="hidden lg:block">
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Your Cart
                </h3>
                {cart.size === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Your cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {Array.from(cart.values()).map(({ item, quantity }) => (
                        <div key={item.id} className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">₹{item.price} × {quantity}</p>
                          </div>
                          <p className="font-semibold">₹{(item.price * quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Calories</span>
                        <span className="font-semibold">{getTotalCalories()} cal</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Amount</span>
                        <span>₹{getTotalAmount().toFixed(2)}</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" size="lg" onClick={handleCheckout}>
                      Proceed to Checkout
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Cart Button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            className="lg:hidden fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg"
            size="icon"
          >
            <ShoppingCart className="w-6 h-6" />
            {cart.size > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {cart.size}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Your Cart</SheetTitle>
            <SheetDescription>
              Review your items before checkout
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {cart.size === 0 ? (
              <p className="text-muted-foreground text-center py-8">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {Array.from(cart.values()).map(({ item, quantity }) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">₹{item.price} × {quantity}</p>
                      </div>
                      <p className="font-semibold">₹{(item.price * quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Calories</span>
                    <span className="font-semibold">{getTotalCalories()} cal</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span>₹{getTotalAmount().toFixed(2)}</span>
                  </div>
                </div>
                <Button className="w-full mt-4" size="lg" onClick={handleCheckout}>
                  Proceed to Checkout
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Restaurant;
