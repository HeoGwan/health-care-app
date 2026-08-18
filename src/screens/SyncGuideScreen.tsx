import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { samsungHealthService } from '../services/samsungHealthService';

interface SyncGuideScreenProps {
  onClose: () => void;
  onSync: () => void;
}

const SyncGuideScreen: React.FC<SyncGuideScreenProps> = ({
  onClose,
  onSync,
}) => {
  const [guide, setGuide] = React.useState<any>(null);

  React.useEffect(() => {
    loadGuide();
  }, []);

  const loadGuide = async () => {
    const guideData = await samsungHealthService.getSyncGuide();
    setGuide(guideData);
  };

  const handleOpenSamsungHealth = async () => {
    const opened = await samsungHealthService.openSamsungHealth();
    if (opened) {
      Alert.alert(
        '삼성 헬스 앱이 열렸습니다',
        '설정 > 데이터 권한 > Health Connect 동기화를 활성화해주세요.',
        [{ text: '확인' }],
      );
    } else {
      Alert.alert('앱 열기 실패', '삼성 헬스 앱이 설치되어 있지 않습니다.', [
        { text: '확인' },
      ]);
    }
  };

  const handleOpenHealthConnect = async () => {
    const opened = await samsungHealthService.openHealthConnectSettings();
    if (opened) {
      Alert.alert(
        'Health Connect 설정이 열렸습니다',
        '연결된 앱에서 삼성 헬스를 확인해주세요.',
        [{ text: '확인' }],
      );
    } else {
      Alert.alert(
        '설정 열기 실패',
        'Health Connect가 설치되어 있지 않습니다.',
        [{ text: '확인' }],
      );
    }
  };

  const handleSyncComplete = () => {
    Alert.alert('동기화 완료', '앱을 재시작하여 데이터를 불러옵니다.', [
      {
        text: '확인',
        onPress: () => {
          onSync();
          onClose();
        },
      },
    ]);
  };

  if (!guide) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>가이드 로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{guide.title}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 안내 메시지 */}
        <View style={styles.messageBox}>
          <Text style={styles.messageIcon}>ℹ️</Text>
          <Text style={styles.messageText}>
            Health Connect에 데이터가 없습니다.{'\n'}
            삼성 헬스와 동기화를 설정해주세요.
          </Text>
        </View>

        {/* 단계별 가이드 */}
        <Text style={styles.sectionTitle}>📋 설정 방법</Text>
        {guide.steps.map((step: any, index: number) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.step}</Text>
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
            </View>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>
        ))}

        {/* 빠른 실행 버튼 */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>⚡ 빠른 실행</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleOpenSamsungHealth}
          >
            <Text style={styles.actionButtonIcon}>📱</Text>
            <View style={styles.actionButtonTextContainer}>
              <Text style={styles.actionButtonTitle}>삼성 헬스 열기</Text>
              <Text style={styles.actionButtonSubtitle}>
                설정 → 데이터 권한으로 이동
              </Text>
            </View>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleOpenHealthConnect}
          >
            <Text style={styles.actionButtonIcon}>⚙️</Text>
            <View style={styles.actionButtonTextContainer}>
              <Text style={styles.actionButtonTitle}>Health Connect 설정</Text>
              <Text style={styles.actionButtonSubtitle}>
                연결된 앱 확인하기
              </Text>
            </View>
            <Text style={styles.actionButtonArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 문제 해결 */}
        <Text style={styles.sectionTitle}>💡 문제 해결</Text>
        <View style={styles.troubleshootingBox}>
          {guide.troubleshooting.map((tip: string, index: number) => (
            <View key={index} style={styles.troubleshootingItem}>
              <Text style={styles.troubleshootingBullet}>•</Text>
              <Text style={styles.troubleshootingText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* 동기화 완료 버튼 */}
        <TouchableOpacity
          style={styles.syncCompleteButton}
          onPress={handleSyncComplete}
        >
          <Text style={styles.syncCompleteButtonText}>
            ✓ 동기화 완료 후 재시작
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loading: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#999',
  },
  messageBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  messageIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 15,
    color: '#1976d2',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  stepCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 40,
  },
  quickActionsSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  actionButtonTextContainer: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  actionButtonSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  actionButtonArrow: {
    fontSize: 32,
    color: '#ccc',
    marginLeft: 8,
  },
  troubleshootingBox: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  troubleshootingItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  troubleshootingBullet: {
    fontSize: 16,
    color: '#f57c00',
    marginRight: 8,
    marginTop: 2,
  },
  troubleshootingText: {
    flex: 1,
    fontSize: 14,
    color: '#e65100',
    lineHeight: 20,
  },
  syncCompleteButton: {
    backgroundColor: '#4caf50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  syncCompleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default SyncGuideScreen;
