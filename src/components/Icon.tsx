import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = '#000',
}) => {
  const getIconSymbol = (iconName: string): string => {
    switch (iconName) {
      case 'home':
        return '🏠';
      case 'activity':
        return '📊';
      case 'plus':
        return '➕';
      case 'gift':
        return '🎁';
      case 'user':
        return '👤';
      case 'heart':
        return '❤️';
      case 'apple':
        return '🍎';
      case 'moon':
        return '🌙';
      default:
        return '❓';
    }
  };

  return (
    <Text style={[styles.icon, { fontSize: size, color }]}>
      {getIconSymbol(name)}
    </Text>
  );
};

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
  },
});
