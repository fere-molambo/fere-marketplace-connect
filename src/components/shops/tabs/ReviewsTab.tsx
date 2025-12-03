import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/reviews/StarRating";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { AddReviewDialog } from "@/components/reviews/AddReviewDialog";
import { toast } from "sonner";

interface ReviewsTabProps {
  shopId: string;
}

export const ReviewsTab = ({ shopId }: ReviewsTabProps) => {
  const { user } = useAuth();
  const { isSuperAdmin, isAdmin } = useUserRoles();

  // Check if user can manage shop reviews
  const { data: canManage } = useQuery({
    queryKey: ["can-manage-reviews", shopId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      if (isSuperAdmin || isAdmin) return true;

      // Check if owner or team member
      const { data: shop } = await supabase
        .from("shops")
        .select("owner_id")
        .eq("id", shopId)
        .single();

      if (shop?.owner_id === user.id) return true;

      const { data: teamMember } = await supabase
        .from("shop_team_members")
        .select("id")
        .eq("shop_id", shopId)
        .eq("member_id", user.id)
        .maybeSingle();

      return !!teamMember;
    },
    enabled: !!user && !!shopId,
  });

  // Fetch reviews with user info and replies
  const { data: reviews, isLoading, refetch } = useQuery({
    queryKey: ["shop-reviews", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_reviews")
        .select(`
          *,
          user:profiles!user_id (nom_complet, photo_profil)
        `)
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch replies for each review
      const reviewsWithReplies = await Promise.all(
        (data || []).map(async (review) => {
          const { data: replies } = await supabase
            .from("review_replies")
            .select(`
              *,
              user:profiles!user_id (nom_complet, photo_profil)
            `)
            .eq("review_id", review.id)
            .order("created_at", { ascending: true });

          return {
            ...review,
            replies: replies || [],
          };
        })
      );

      return reviewsWithReplies;
    },
    enabled: !!shopId,
  });

  const hasExistingReview = reviews?.some((r) => r.user_id === user?.id) || false;

  const averageRating =
    reviews && reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : 0;

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from("shop_reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;
      toast.success("Avis supprimé");
      refetch();
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    try {
      const { error } = await supabase
        .from("review_replies")
        .delete()
        .eq("id", replyId);

      if (error) throw error;
      toast.success("Réponse supprimée");
      refetch();
    } catch (error) {
      console.error("Error deleting reply:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats and add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold">{averageRating.toFixed(1)}</p>
            <StarRating rating={Math.round(averageRating)} readonly size="sm" />
            <p className="text-xs text-muted-foreground mt-1">
              {reviews?.length || 0} avis
            </p>
          </div>
        </div>

        {user && (
          <AddReviewDialog
            shopId={shopId}
            onReviewAdded={refetch}
            hasExistingReview={hasExistingReview}
          />
        )}
      </div>

      {/* Reviews list */}
      {!reviews || reviews.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun avis pour le moment. Soyez le premier à donner votre avis !
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              canManage={canManage || false}
              canReply={canManage || false}
              currentUserId={user?.id}
              onDelete={handleDeleteReview}
              onDeleteReply={handleDeleteReply}
              onReplyAdded={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
};