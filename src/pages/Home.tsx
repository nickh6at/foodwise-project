import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import RestaurantCard from "@/components/RestaurantCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { toast } from "sonner";
import heroFood from "@/assets/hero-food.jpg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Home = () => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState("all");
  const [isRestaurantOwner, setIsRestaurantOwner] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      checkUserRole();
      fetchRestaurants();
    }
  }, [user]);

  useEffect(() => {
    filterRestaurants();
  }, [searchQuery, cuisineFilter, restaurants]);

  const checkUserRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "restaurant_owner")
      .maybeSingle();
    
    setIsRestaurantOwner(!!data);
  };

  const fetchRestaurants = async () => {
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("is_active", true)
      .order("rating", { ascending: false });

    if (error) {
      toast.error("Failed to load restaurants");
      return;
    }

    setRestaurants(data || []);
  };

  const filterRestaurants = () => {
    let filtered = [...restaurants];

    if (searchQuery) {
      filtered = filtered.filter((restaurant) =>
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (cuisineFilter !== "all") {
      filtered = filtered.filter((restaurant) =>
        restaurant.cuisine_type.toLowerCase() === cuisineFilter.toLowerCase()
      );
    }

    setFilteredRestaurants(filtered);
  };

  const cuisines = ["all", ...Array.from(new Set(restaurants.map(r => r.cuisine_type)))];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} isRestaurantOwner={isRestaurantOwner} />

      {/* Hero Section */}
      <div className="relative h-[400px] overflow-hidden">
        <img
          src={heroFood}
          alt="Fresh healthy food"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30 flex items-center justify-center">
          <div className="container mx-auto px-4 text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Order Food with <span className="text-primary">Nutritional Intelligence</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 text-white/90">
              Make smarter food choices. Track your health. Enjoy delicious meals.
            </p>
            <div className="max-w-2xl mx-auto flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search restaurants or dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-white"
                />
              </div>
              <Button variant="hero" size="lg">
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4">
          <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by cuisine" />
            </SelectTrigger>
            <SelectContent>
              {cuisines.map((cuisine) => (
                <SelectItem key={cuisine} value={cuisine}>
                  {cuisine === "all" ? "All Cuisines" : cuisine}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? "s" : ""} found
          </span>
        </div>
      </div>

      {/* Restaurants Grid */}
      <div className="container mx-auto px-4 pb-12">
        {filteredRestaurants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No restaurants found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                id={restaurant.id}
                name={restaurant.name}
                description={restaurant.description || ""}
                imageUrl={restaurant.image_url}
                cuisineType={restaurant.cuisine_type}
                rating={restaurant.rating}
                deliveryTime={restaurant.delivery_time_minutes}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
