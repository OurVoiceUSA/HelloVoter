import { styled, css } from '../lib/react-native';

import { colors } from '../lib/colors';

export const RegularText = styled.Text`
  font-size: 14px;
  line-height: 19px;
`;

export const SemiBoldText = styled(RegularText)``;

export const BoldText = styled(RegularText)``;

export const ExtraBoldText = styled(RegularText)``;

export const Heading = styled(BoldText)`
  color: ${colors.darkGrey};
  font-size: 22px;
  line-height: 35px;
  text-align: center;
`;

export const ScreenTitle = styled(BoldText)`
  color: ${colors.darkGrey};
  font-size: 18px;
`;

export const TextButton = styled(SemiBoldText)`
  color: ${colors.grey};
  font-size: 15px;
`;

export const MediumText = styled(RegularText)`
  color: ${colors.grey};
`;

export const MediumSemiStrongText = styled(SemiBoldText)`
  color: ${colors.darkGrey};
`;

export const MediumStrongText = styled(BoldText)`
  color: ${colors.darkGrey};
`;

export const SmallHeading = styled(BoldText)`
  font-size: 16px;
  line-height: 22px;
  color: ${colors.darkGrey};
`;

const smallText = css`
  font-size: 13px;
  line-height: 18px;
  letter-spacing: -0.014px;
  color: ${colors.grey};
`;

export const SmallText = styled(RegularText)`
  ${smallText}
`;

export const SmallSemiStrongText = styled(SemiBoldText)`
  ${smallText}
  color: ${colors.darkGrey};
`;

export const SmallStrongText = styled(BoldText)`
  ${smallText}
  color: ${colors.darkGrey};
`;

export const Price = styled(MediumStrongText)`
  color: ${colors.green};
`;

export const Link = styled(MediumStrongText)`
  color: ${colors.blue};
`;

export const ButtonText = styled(MediumStrongText)`
  color: ${colors.white};
  font-weight: 700;
`;
