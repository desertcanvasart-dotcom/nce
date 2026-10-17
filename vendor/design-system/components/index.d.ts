import type * as React from 'react';

export type VesselType = 'sail' | 'motor' | 'steam' | 'felucca';
export type SceneTime = 'dawn' | 'day' | 'dusk' | 'night';
export type IconName = 'arrow-right' | 'arrow-up-right' | 'chevron-down' | 'chevron-left' | 'chevron-right' | 'calendar' | 'users' | 'pin' | 'heart' | 'star' | 'plus' | 'minus' | 'check' | 'close' | 'menu' | 'play' | 'pause' | 'info' | 'clock' | 'route' | 'ruler' | 'plane' | 'sail' | 'engine' | 'steam' | 'anchor' | 'compass' | 'pool' | 'sundeck' | 'spa' | 'wifi' | 'ac' | 'balcony' | 'bath' | 'restaurant' | 'bar' | 'wine' | 'gym' | 'egyptologist' | 'butler' | 'library' | 'accessible' | 'bed' | 'temple' | 'sunrise' | 'music' | 'quiet';

export interface IconProps { name: IconName; label?: string; size?: number; className?: string }
export declare function Icon(props: IconProps): React.ReactElement;

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> { variant?: 'primary' | 'outline' | 'ghost' | 'link'; size?: 'sm' | 'md' | 'lg'; icon?: IconName; onMedia?: boolean; block?: boolean; href?: string; children?: React.ReactNode }
export declare function Button(props: ButtonProps): React.ReactElement;

export interface BadgeProps { tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'media'; icon?: IconName; children?: React.ReactNode }
export declare function Badge(props: BadgeProps): React.ReactElement;

export interface RatingProps { value: number; count?: number }
export declare function Rating(props: RatingProps): React.ReactElement;

export interface SectionHeadingProps { title: React.ReactNode; eyebrow?: string; intro?: React.ReactNode; align?: 'center' | 'left'; as?: 'h1' | 'h2' | 'h3'; ornament?: boolean }
export declare function SectionHeading(props: SectionHeadingProps): React.ReactElement;

export interface SceneProps { time?: SceneTime; vessel?: VesselType | null; temple?: boolean; parallax?: boolean; label?: string; className?: string }
export declare function Scene(props: SceneProps): React.ReactElement;

export interface VesselArtProps { type?: VesselType; title?: string; waterline?: boolean; className?: string }
export declare function VesselArt(props: VesselArtProps): React.ReactElement;

export interface NavBarProps { links?: string[]; active?: number; brand?: string; tagline?: string; cta?: string; overMedia?: boolean; lang?: string; onNavigate?(index: number): void; onLanguage?(lang: string): void }
export declare function NavBar(props: NavBarProps): React.ReactElement;

export interface HeroProps { title: React.ReactNode; eyebrow?: string; subtitle?: React.ReactNode; action?: React.ReactNode; nav?: React.ReactNode; image?: string; time?: SceneTime; vessel?: VesselType | null; height?: number; children?: React.ReactNode }
export declare function Hero(props: HeroProps): React.ReactElement;

export interface SearchRoute { label: string; sub?: string; days: number[] }
export interface SearchVessel { label: string; sub?: string; icon?: IconName }
export interface CruiseSearchProps { routes?: SearchRoute[]; vessels?: SearchVessel[]; defaultVessel?: number; onMedia?: boolean; cta?: string; onSearch?(q: { route: SearchRoute; vessel: SearchVessel; date: Date | null; adults: number; children: number }): void }
export declare function CruiseSearch(props: CruiseSearchProps): React.ReactElement;

export interface StepperProps { label?: string; min?: number; max?: number; value?: number; defaultValue?: number; onChange?(n: number): void }
export declare function Stepper(props: StepperProps): React.ReactElement;

export interface TextFieldProps { label: string; type?: string; hint?: string; error?: string; multiline?: boolean; defaultValue?: string; onChange?(v: string): void }
export declare function TextField(props: TextFieldProps): React.ReactElement;

export interface CruiseCardProps { name: string; vessel?: VesselType; route?: string[]; nights?: number; guests?: number; rating?: number; reviews?: number; price: number; currency?: string; amenities?: IconName[]; badges?: { label: string; tone?: BadgeProps['tone']; icon?: IconName }[]; image?: string; imageAlt?: string; time?: SceneTime; saved?: boolean; compared?: boolean; onSave?(saved: boolean): void; onCompare?(on: boolean): void }
export declare function CruiseCard(props: CruiseCardProps): React.ReactElement;

export interface VesselTypeCardProps { type: 'sail' | 'motor' | 'steam'; title?: string; eyebrow?: string; description?: string; facts?: [IconName, string][]; href?: string; cta?: string }
export declare function VesselTypeCard(props: VesselTypeCardProps): React.ReactElement;

export interface VesselCompareProps { types?: ('sail' | 'motor' | 'steam')[]; defaultType?: 'sail' | 'motor' | 'steam' }
export declare function VesselCompare(props: VesselCompareProps): React.ReactElement;

export interface PriceFactor { id: string; label: string; icon: IconName; options: { label: string; v: number; why: string }[] }
export interface PriceAnatomyProps { factors?: PriceFactor[]; defaultPreset?: 'low' | 'high'; currency?: string; eyebrow?: string; note?: string; footnote?: string }
export declare function PriceAnatomy(props: PriceAnatomyProps): React.ReactElement;

export interface Amenity { icon: IconName; label?: string; status?: 'included' | 'request' | 'none'; note?: string }
export interface AmenityGridProps { items: Amenity[]; filters?: boolean; columns?: number }
export declare function AmenityGrid(props: AmenityGridProps): React.ReactElement;

export interface ExperienceCardProps { title: string; description?: string; children?: React.ReactNode; image?: string; imageAlt?: string; time?: SceneTime; vessel?: VesselType | null; temple?: boolean; href?: string; cta?: string }
export declare function ExperienceCard(props: ExperienceCardProps): React.ReactElement;

export interface ItineraryStop { day: number; place: string; title: string; body: string; tags?: string[] }
export interface ItineraryTimelineProps { stops?: ItineraryStop[]; vessel?: VesselType }
export declare function ItineraryTimeline(props: ItineraryTimelineProps): React.ReactElement;

export interface Cabin { name: string; size: string; deck: string; bed: string; price: number; left?: number; soldOut?: boolean }
export interface CabinPickerProps { cabins?: Cabin[]; defaultValue?: number; currency?: string; legend?: string; onChange?(cabin: Cabin, index: number): void }
export declare function CabinPicker(props: CabinPickerProps): React.ReactElement;

export interface BookingSummaryProps { pricePerPerson?: number; nights?: number; vesselName?: string; cabinName?: string; departure?: string }
export declare function BookingSummary(props: BookingSummaryProps): React.ReactElement;

export interface GalleryItem { image?: string; time?: SceneTime; vessel?: VesselType | null; temple?: boolean; caption: string; meta?: string; alt?: string }
export interface GalleryProps { items: GalleryItem[]; label?: string }
export declare function Gallery(props: GalleryProps): React.ReactElement;

declare global { interface Window { Nilecrz: { Icon: typeof Icon; Button: typeof Button; Badge: typeof Badge; Rating: typeof Rating; SectionHeading: typeof SectionHeading; Scene: typeof Scene; VesselArt: typeof VesselArt; NavBar: typeof NavBar; Hero: typeof Hero; CruiseSearch: typeof CruiseSearch; Stepper: typeof Stepper; TextField: typeof TextField; CruiseCard: typeof CruiseCard; VesselTypeCard: typeof VesselTypeCard; VesselCompare: typeof VesselCompare; PriceAnatomy: typeof PriceAnatomy; AmenityGrid: typeof AmenityGrid; ExperienceCard: typeof ExperienceCard; ItineraryTimeline: typeof ItineraryTimeline; CabinPicker: typeof CabinPicker; BookingSummary: typeof BookingSummary; Gallery: typeof Gallery } } }
