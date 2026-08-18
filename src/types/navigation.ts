export type TabNavigationType =
  | 'home'
  | 'health-report'
  | 'add'
  | 'points'
  | 'profile';

export interface NavigationItem {
  id: TabNavigationType;
  title: string;
  icon: string;
  isCenter?: boolean;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'home',
    title: '홈',
    icon: 'home',
  },
  {
    id: 'health-report',
    title: '건강리포트',
    icon: 'activity',
  },
  {
    id: 'add',
    title: '',
    icon: 'plus',
    isCenter: true,
  },
  {
    id: 'points',
    title: '포인트',
    icon: 'gift',
  },
  {
    id: 'profile',
    title: '내정보',
    icon: 'user',
  },
];
