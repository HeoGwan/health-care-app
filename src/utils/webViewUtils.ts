/**
 * URL 유효성 검사
 */
export const isValidUrl = (url: string): boolean => {
  const urlPattern = /^https?:\/\/[^\s$.?#].[^\s]*$/;
  return urlPattern.test(url);
};

/**
 * URL에 프로토콜이 없으면 https 추가
 */
export const formatUrl = (url: string): string => {
  if (!url) return '';

  // 이미 프로토콜이 있는지 확인
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // 프로토콜이 없으면 https 추가
  return `https://${url}`;
};

/**
 * URL에서 도메인 추출
 */
export const extractDomain = (url: string): string => {
  try {
    const match = url.match(/^https?:\/\/([^/]+)/);
    return match ? match[1] : url;
  } catch {
    return url;
  }
};

/**
 * 타이틀 길이 제한
 */
export const truncateTitle = (
  title: string,
  maxLength: number = 30,
): string => {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength) + '...';
};
