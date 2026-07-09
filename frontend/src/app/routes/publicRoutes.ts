import { lazy } from "react";

import type { AppRouteConfig } from "./routeTypes";

const Shop = lazy(() => import("../../pages/Shop"));
const Events = lazy(() => import("../../pages/Events"));
const SparkClub = lazy(() => import("../../pages/SparkClub"));
const News = lazy(() => import("../../pages/News"));
// BOOKING REMOVED - US version e-commerce only
const ProductDetailPage = lazy(() => import("../../pages/ProductDetailPage"));
const RetailProductDetailPage = lazy(() => import("../../pages/RetailProductDetailPage"));
const RetailShopPage = lazy(() => import("../../pages/RetailShopPage"));

export const publicRouteConfigs: AppRouteConfig[] = [
  { path: "shop", Page: Shop },
  { path: "shop/product/:productId", Page: ProductDetailPage },
  { path: "events", Page: Events },
  { path: "spark-club", Page: SparkClub },
  { path: "news", Page: News },
  // BOOKING ROUTES REMOVED - US version e-commerce only
  { path: "shop/retail", Page: RetailShopPage },
  { path: "shop/retail/product/:productId", Page: RetailProductDetailPage },
];
