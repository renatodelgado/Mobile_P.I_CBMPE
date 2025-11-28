// eslint-disable-next-line import/no-named-as-default
import styled from "styled-components/native";
import { Platform } from "react-native";
// import LogoSvg from "../../assets/logo.svg";

export const Container = styled.View`
  flex: 1;
  background-color: #1e293b;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

export const Card = styled.View.attrs(() => ({
  style: Platform.select({
    android: { elevation: 6 },
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    default: {},
  }),
}))`
  width: 100%;
  max-width: 390px;
  background-color: #f5f5f5;
  padding: 28px;
  border-radius: 14px;
`;

export const Logo = styled.Image`
  max-width: 60px;
  align-self: center;
  margin-bottom: 12px;
`;

export const Title = styled.Text`
  font-size: 28px;
  color: #1e293b;
  font-weight: 700;
  text-align: center;
`;

export const Subtitle = styled.Text`
  font-size: 14px;
  color: #334155;
  text-align: center;
  margin-bottom: 24px;
`;

export const Label = styled.Text`
  color: #1e293b;
  font-size: 15px;
  font-weight: 600;
  margin: 6px 0;
  text-align: left;
`;

export const InputWrapper = styled.View`
  width: 100%;
  margin-bottom: 12px;
  position: relative;
`;

export const IconContainer = styled.View`
  position: absolute;
  left: 14px;
  top: 0;
  bottom: 0;
  width: 40px;
  justify-content: center;
  align-items: center;
  z-index: 5;
`;

export const InputIcon = styled.Image`
  width: 18px;
  height: 18px;
  position: absolute;
  left: 12px;
  opacity: 0.7;
`;

export const Input = styled.TextInput`
  width: 100%;
  height: 48px;
  padding-left: 52px;    /* Increased from 44px to match new icon container width */
  padding-right: 12px;
  background-color: #fff;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 16px;
`;

export const RememberRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 20px;
`;

export const RememberText = styled.Text`
  color: #1e293b;
  font-size: 14px;
`;

export const ForgotText = styled.Text`
  color: #dc2625;
  font-size: 14px;
`;

export const RememberButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
`;

export const CheckboxBox = styled.View`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  justify-content: center;
  align-items: center;
`;

export const CheckMark = styled.Text`
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
`;
export const Button = styled.View.attrs(() => ({
  style: Platform.select({
    android: { elevation: 3 },
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1,
    },
    default: {},
  }),
}))`
  background-color: #dc2625;
  height: 48px;
  border-radius: 8px;
  justify-content: center;
  align-items: center;
`;

export const ButtonText = styled.Text`
  color: #fff;
  font-size: 16px;
  font-weight: 700;
`;
