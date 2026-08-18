import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { NAVIGATION_ITEMS, TabNavigationType } from '../types/navigation';

interface BottomNavigationProps {
  activeTab: TabNavigationType;
  onTabPress: (tab: TabNavigationType) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabPress,
}) => {
  return (
    <View style={styles.container}>
      {NAVIGATION_ITEMS.map(item => {
        const isActive = activeTab === item.id;
        const isCenter = item.isCenter;

        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.tabItem, isCenter && styles.centerTabItem]}
            onPress={() => onTabPress(item.id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                isCenter && styles.centerIconContainer,
                isActive && !isCenter && styles.activeIconContainer,
              ]}
            >
              <Icon
                name={item.icon}
                size={isCenter ? 28 : 24}
                color={isCenter ? '#FFFFFF' : isActive ? '#007AFF' : '#8E8E93'}
              />
            </View>
            {!isCenter && (
              <Text
                style={[styles.tabLabel, isActive && styles.activeTabLabel]}
              >
                {item.title}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  centerTabItem: {
    marginTop: -20,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  centerIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  activeIconContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
  },
  tabLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTabLabel: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
