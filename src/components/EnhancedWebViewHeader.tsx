import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { COLORS, SIZES } from '../constants';
import { NavigationState } from '../types';
import { extractDomain } from '../utils/webViewUtils';

interface EnhancedWebViewHeaderProps {
  navigationState: NavigationState;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onHome: () => void;
  onToggleUrlBar?: () => void;
  onShare?: () => void;
  showControls?: boolean;
}

export const EnhancedWebViewHeader: React.FC<EnhancedWebViewHeaderProps> = ({
  navigationState,
  onBack,
  onForward,
  onReload,
  onHome,
  onToggleUrlBar,
  onShare,
  showControls = true,
}) => {
  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }

    try {
      await Share.share({
        message: navigationState.url,
        title: navigationState.title || extractDomain(navigationState.url),
      });
    } catch (error) {
      Alert.alert('공유 실패', '페이지를 공유할 수 없습니다.');
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.domain}>{extractDomain(navigationState.url)}</Text>
        {navigationState.loading && (
          <ActivityIndicator
            size="small"
            color={COLORS.PRIMARY}
            style={styles.loadingIndicator}
          />
        )}
      </View>

      {showControls && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              !navigationState.canGoBack && styles.disabledButton,
            ]}
            onPress={onBack}
            disabled={!navigationState.canGoBack}
          >
            <Text style={styles.controlButtonText}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              !navigationState.canGoForward && styles.disabledButton,
            ]}
            onPress={onForward}
            disabled={!navigationState.canGoForward}
          >
            <Text style={styles.controlButtonText}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={onReload}>
            <Text style={styles.controlButtonText}>↻</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={onHome}>
            <Text style={styles.controlButtonText}>⌂</Text>
          </TouchableOpacity>

          {onToggleUrlBar && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={onToggleUrlBar}
            >
              <Text style={styles.controlButtonText}>🔗</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.controlButton} onPress={handleShare}>
            <Text style={styles.controlButtonText}>⤴</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: SIZES.HEADER_HEIGHT,
    backgroundColor: COLORS.WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.PADDING,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.LIGHT_GRAY,
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  domain: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.BLACK,
    marginRight: SIZES.MARGIN / 2,
  },
  loadingIndicator: {
    marginLeft: SIZES.MARGIN / 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    borderRadius: 18,
    backgroundColor: COLORS.BACKGROUND,
  },
  disabledButton: {
    opacity: 0.3,
  },
  controlButtonText: {
    fontSize: 16,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
  },
});
