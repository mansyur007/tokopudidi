import { apiFetch } from './client';

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    stock: number;
    isActive: boolean;
    weight: number;
  };
  variant: { id: string; name: string; stock: number } | null;
  shop: { id: string; name: string; slug: string; isOpen: boolean };
}

export interface CartGroup {
  shop: CartItem['shop'];
  items: CartItem[];
}

export interface CartResponse {
  items: CartItem[];
  grouped: CartGroup[];
}

export function getCart(token: string): Promise<CartResponse> {
  return apiFetch<CartResponse>('/api/v1/cart', { token });
}

export function addCartItem(
  token: string,
  body: { productId: string; variantId?: string; quantity: number },
) {
  return apiFetch('/api/v1/cart/items', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  });
}

export function updateCartItem(token: string, id: string, quantity: number) {
  return apiFetch(`/api/v1/cart/items/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ quantity }),
  });
}

export function deleteCartItem(token: string, id: string) {
  return apiFetch(`/api/v1/cart/items/${id}`, { method: 'DELETE', token });
}
