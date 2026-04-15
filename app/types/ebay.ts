export interface EbayItem {
  id: string
  ebay_item_id: string
  title: string
  item_url: string
  image_url: string | null
  buying_option: string
  current_price: number
  current_shipping: number
  first_seen_price: number
  first_seen_shipping: number
  first_seen_total_cost: number
  current_total_cost: number
  currency: string
  first_seen_at: string
  last_seen_at: string
  last_price_drop_at: string | null
  ended_at: string | null
  accepts_offers: boolean
}
