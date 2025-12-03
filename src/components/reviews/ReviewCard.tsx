import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare, Trash2, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StarRating } from "./StarRating";
import { ReplyDialog } from "./ReplyDialog";

interface ReviewReply {
  id: string;
  reply: string;
  created_at: string;
  user: {
    nom_complet: string;
    photo_profil: string | null;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  user: {
    nom_complet: string;
    photo_profil: string | null;
  };
  replies: ReviewReply[];
}

interface ReviewCardProps {
  review: Review;
  canManage: boolean;
  canReply: boolean;
  currentUserId: string | undefined;
  onDelete: (reviewId: string) => void;
  onDeleteReply: (replyId: string) => void;
  onReplyAdded: () => void;
}

export const ReviewCard = ({
  review,
  canManage,
  canReply,
  currentUserId,
  onDelete,
  onDeleteReply,
  onReplyAdded,
}: ReviewCardProps) => {
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isOwnReview = currentUserId === review.user_id;
  const canDeleteReview = isOwnReview || canManage;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {/* Review Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.user.photo_profil || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials(review.user.nom_complet)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{review.user.nom_complet}</p>
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} readonly size="sm" />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(review.created_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {canReply && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setReplyDialogOpen(true)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
          {canDeleteReview && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(review.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Review Comment */}
      {review.comment && (
        <p className="text-sm text-foreground">{review.comment}</p>
      )}

      {/* Replies */}
      {review.replies && review.replies.length > 0 && (
        <div className="ml-6 space-y-3 border-l-2 border-muted pl-4">
          {review.replies.map((reply) => (
            <div key={reply.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={reply.user.photo_profil || undefined} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                      {getInitials(reply.user.nom_complet)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-xs">{reply.user.nom_complet}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(reply.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onDeleteReply(reply.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-foreground">{reply.reply}</p>
            </div>
          ))}
        </div>
      )}

      <ReplyDialog
        reviewId={review.id}
        open={replyDialogOpen}
        onOpenChange={setReplyDialogOpen}
        onReplyAdded={onReplyAdded}
      />
    </div>
  );
};