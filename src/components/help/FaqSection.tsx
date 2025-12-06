import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

interface FaqSectionProps {
  faqItems: FaqItem[];
}

export function FaqSection({ faqItems }: FaqSectionProps) {
  // Group by category
  const categories = faqItems.reduce((acc, item) => {
    const category = item.category || "Général";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, FaqItem[]>);

  const categoryNames = Object.keys(categories).sort();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {categoryNames.map((category) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-4">{category}</h3>
          <Accordion type="single" collapsible className="w-full">
            {categories[category].map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}
