import styled from 'styled-components/native';

import { colors } from "../lib/colors";

export const Root = styled.SafeAreaView`
  flex: 1;
  background: ${colors.brand};
`;

export const Content = styled.View`
  flex: 1;
  padding: 15px;
  background: ${colors.white};
`;

export const Spacer = styled.View`
  flex: 1;
`;

export const ViewFlex = Spacer;

export const Row = styled.View`
  flex-direction: row;
`;

export const Space = styled.View`
  height: 15px;
`;

export const ViewCenter = styled.View`
  align-items: center;
`;
