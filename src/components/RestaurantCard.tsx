import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Star } from "lucide-react";
import { Link } from "react-router-dom";
import restaurantPlaceholder from "@/assets/restaurant-placeholder.png";

interface RestaurantCardProps {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  cuisineType: string;
  rating: number;
  deliveryTime: number;
}

const RestaurantCard = ({
  id,
  name,
  description,
  imageUrl,
  cuisineType,
  rating,
  deliveryTime,
}: RestaurantCardProps) => {
  return (
    <Link to={`/restaurant/${id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group">
        <div className="aspect-video overflow-hidden bg-muted">
          <img
            src={imageUrl || restaurantPlaceholder}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-lg line-clamp-1">{name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="secondary">{cuisineType}</Badge>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{deliveryTime} min</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default RestaurantCard;
