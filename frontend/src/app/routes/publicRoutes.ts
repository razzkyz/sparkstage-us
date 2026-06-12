import { lazy } from "react";

import type { AppRouteConfig } from "./routeTypes";

const Shop = lazy(() => import("../../pages/Shop"));
const Events = lazy(() => import("../../pages/Events"));
const SparkClub = lazy(() => import("../../pages/SparkClub"));
const CharmBar = lazy(() => import("../../pages/CharmBar"));
const News = lazy(() => import("../../pages/News"));
const JourneySelectionPage = lazy(
  () => import("../../pages/JourneySelectionPage"),
);
const ProductDetailPage = lazy(() => import("../../pages/ProductDetailPage"));
const RetailProductDetailPage = lazy(() => import("../../pages/RetailProductDetailPage"));
const DressingRoomLandingPage = lazy(
  () => import("../../pages/DressingRoomLandingPage"),
);
const DressingRoomLookPage = lazy(
  () => import("../../pages/DressingRoomLookPage"),
);
const DressingRoomCollectionPage = lazy(
  () => import("../../pages/DressingRoomCollectionPage"),
);
const BeautyPage = lazy(() => import("../../pages/BeautyPage"));
const Booking = lazy(() => import("../../pages/Booking"));
const RetailShopPage = lazy(() => import("../../pages/RetailShopPage"));

export const publicRouteConfigs: AppRouteConfig[] = [
  { path: "shop", Page: Shop },
  { path: "dressing-room", Page: DressingRoomLandingPage },
  { path: "dressing-room/look/:lookNumber", Page: DressingRoomLookPage },
  { path: "dressing-room/:collectionSlug", Page: DressingRoomCollectionPage },
  { path: "glam", Page: BeautyPage },
  { path: "shop/product/:productId", Page: ProductDetailPage },
  { path: "events", Page: Events },
  { path: "spark-club", Page: SparkClub },
  { path: "charm-bar", Page: CharmBar },
  { path: "news", Page: News },
  { path: "journey", Page: JourneySelectionPage },
  { path: "booking", Page: Booking },
  { path: "shop/retail", Page: RetailShopPage },
  { path: "shop/retail/product/:productId", Page: RetailProductDetailPage },
];
