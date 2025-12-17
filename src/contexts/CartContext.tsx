import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartProduct {
  id: string;
  name: string;
  main_media_url: string | null;
  price: number;
  price_type: string;
  discount_percent: number | null;
  min_quantity: number | null;
  min_auto_price: number | null;
  auto_validation: boolean | null;
  quantity_intervals: any[] | null;
  quantity_available: number | null;
  shops: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export interface CartItem {
  productId: string;
  product: CartProduct;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  proposedPrice?: number;
  unitPrice: number;
  totalPrice: number;
}

interface CartContextType {
  items: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: CartProduct, quantity: number, options?: { color?: string; size?: string; proposedPrice?: number }) => string | null;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateProposedPrice: (productId: string, price: number) => void;
  clearCart: () => void;
  totalAmount: number;
  itemCount: number;
  getValidationError: (item: CartItem) => string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "fere_cart";

// Calculate unit price based on pricing type and quantity
export const calculateUnitPrice = (product: CartProduct, quantity: number, proposedPrice?: number): number => {
  let basePrice = product.price;

  // Apply discount if any
  if (product.discount_percent && product.discount_percent > 0) {
    basePrice = basePrice * (1 - product.discount_percent / 100);
  }

  if (product.price_type === "en_gros" && product.quantity_intervals) {
    const intervals = product.quantity_intervals as { min: number; max: number; price: number }[];
    for (const interval of intervals) {
      if (quantity >= interval.min && quantity <= interval.max) {
        return interval.price;
      }
    }
    // If no interval matches, use the last one for quantities above max
    if (intervals.length > 0 && quantity > intervals[intervals.length - 1].max) {
      return intervals[intervals.length - 1].price;
    }
  }

  if (product.price_type === "negoce" && proposedPrice !== undefined) {
    return proposedPrice;
  }

  return basePrice;
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const getValidationError = (item: CartItem): string | null => {
    // Check minimum quantity for bulk pricing
    if (item.product.price_type === "en_gros" && item.product.min_quantity) {
      if (item.quantity < item.product.min_quantity) {
        return `Quantité minimum : ${item.product.min_quantity} unités`;
      }
    }

    // Check proposed price for negotiated pricing
    if (item.product.price_type === "negoce" && item.proposedPrice !== undefined) {
      if (item.product.min_auto_price && item.proposedPrice < item.product.min_auto_price) {
        return `Le prix est en-dessous du prix minimum du vendeur : veuillez mettre au minimum ${item.product.min_auto_price.toLocaleString()} FCFA`;
      }
    }

    return null;
  };

  const addToCart = (
    product: CartProduct, 
    quantity: number, 
    options?: { color?: string; size?: string; proposedPrice?: number }
  ): string | null => {
    // Validation for bulk products
    if (product.price_type === "en_gros" && product.min_quantity && quantity < product.min_quantity) {
      return `Quantité minimum requise : ${product.min_quantity} unités`;
    }

    // Validation for negotiated price
    if (product.price_type === "negoce" && options?.proposedPrice !== undefined) {
      if (product.min_auto_price && options.proposedPrice < product.min_auto_price) {
        return `Le prix proposé est en-dessous du minimum accepté (${product.min_auto_price.toLocaleString()} FCFA)`;
      }
    }

    const unitPrice = calculateUnitPrice(product, quantity, options?.proposedPrice);
    
    setItems(prev => {
      const existingIndex = prev.findIndex(item => 
        item.productId === product.id && 
        item.selectedColor === options?.color && 
        item.selectedSize === options?.size
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        const newQuantity = updated[existingIndex].quantity + quantity;
        const newUnitPrice = calculateUnitPrice(product, newQuantity, options?.proposedPrice);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQuantity,
          unitPrice: newUnitPrice,
          totalPrice: newUnitPrice * newQuantity,
          proposedPrice: options?.proposedPrice,
        };
        return updated;
      }

      return [...prev, {
        productId: product.id,
        product,
        quantity,
        selectedColor: options?.color,
        selectedSize: options?.size,
        proposedPrice: options?.proposedPrice,
        unitPrice,
        totalPrice: unitPrice * quantity,
      }];
    });

    return null;
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newUnitPrice = calculateUnitPrice(item.product, quantity, item.proposedPrice);
        return {
          ...item,
          quantity,
          unitPrice: newUnitPrice,
          totalPrice: newUnitPrice * quantity,
        };
      }
      return item;
    }));
  };

  const updateProposedPrice = (productId: string, price: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newUnitPrice = calculateUnitPrice(item.product, item.quantity, price);
        return {
          ...item,
          proposedPrice: price,
          unitPrice: newUnitPrice,
          totalPrice: newUnitPrice * item.quantity,
        };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateProposedPrice,
      clearCart,
      totalAmount,
      itemCount,
      getValidationError,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
