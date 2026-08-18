import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
} from 'react-native';
import { COLORS, SIZES } from '../constants';
import { formatUrl, isValidUrl } from '../utils/webViewUtils';

interface URLInputBarProps {
  currentUrl: string;
  onNavigate: (url: string) => void;
}

export const URLInputBar: React.FC<URLInputBarProps> = ({
  currentUrl,
  onNavigate,
}) => {
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = () => {
    const formattedUrl = formatUrl(inputUrl.trim());

    if (!formattedUrl) {
      Alert.alert('오류', 'URL을 입력해주세요.');
      return;
    }

    if (!isValidUrl(formattedUrl)) {
      Alert.alert('오류', '올바른 URL 형식이 아닙니다.');
      return;
    }

    onNavigate(formattedUrl);
    setIsEditing(false);
    Keyboard.dismiss();
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setInputUrl(currentUrl);
  };

  const handleCancel = () => {
    setInputUrl(currentUrl);
    setIsEditing(false);
    Keyboard.dismiss();
  };

  // URL이 변경되면 입력 필드도 업데이트
  React.useEffect(() => {
    if (!isEditing) {
      setInputUrl(currentUrl);
    }
  }, [currentUrl, isEditing]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={inputUrl}
        onChangeText={setInputUrl}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={handleSubmit}
        placeholder="웹사이트 주소를 입력하세요..."
        placeholderTextColor={COLORS.GRAY}
        returnKeyType="go"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        selectTextOnFocus={true}
      />

      {isEditing && (
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.goButton} onPress={handleSubmit}>
            <Text style={styles.goButtonText}>이동</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: SIZES.PADDING,
    paddingVertical: SIZES.MARGIN,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.LIGHT_GRAY,
  },
  input: {
    height: SIZES.BUTTON_HEIGHT,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: SIZES.BORDER_RADIUS,
    paddingHorizontal: SIZES.PADDING,
    fontSize: 16,
    color: COLORS.BLACK,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SIZES.MARGIN,
    gap: SIZES.MARGIN,
  },
  cancelButton: {
    paddingHorizontal: SIZES.PADDING,
    paddingVertical: SIZES.MARGIN / 2,
    borderRadius: SIZES.BORDER_RADIUS,
    backgroundColor: COLORS.LIGHT_GRAY,
  },
  cancelButtonText: {
    color: COLORS.GRAY,
    fontWeight: '600',
  },
  goButton: {
    paddingHorizontal: SIZES.PADDING,
    paddingVertical: SIZES.MARGIN / 2,
    borderRadius: SIZES.BORDER_RADIUS,
    backgroundColor: COLORS.PRIMARY,
  },
  goButtonText: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
});
