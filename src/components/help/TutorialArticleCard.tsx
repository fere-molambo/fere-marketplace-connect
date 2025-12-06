import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Article {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  tag: string | null;
  slug: string;
}

interface TutorialArticleCardProps {
  article: Article;
}

export function TutorialArticleCard({ article }: TutorialArticleCardProps) {
  return (
    <Link to={`/aide/article/${article.slug}`}>
      <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow">
        <div className="relative aspect-video bg-muted">
          {article.thumbnail_url ? (
            <img
              src={article.thumbnail_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary/50 to-secondary/20 flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {article.tag && (
            <Badge
              variant="secondary"
              className="absolute top-2 right-2"
            >
              {article.tag}
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold line-clamp-2 mb-1">{article.title}</h3>
          {article.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {article.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
