-- Add foreign key constraint to purchased_tickets so PostgREST can embed it inside order_items

ALTER TABLE public.purchased_tickets 
  ADD CONSTRAINT purchased_tickets_order_item_id_fkey 
  FOREIGN KEY (order_item_id) 
  REFERENCES public.order_items(id) 
  ON DELETE CASCADE;
