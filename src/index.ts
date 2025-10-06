import faceShapeMain, {
  connectFaceShapeClient,
  predictClassification,
  labels,
} from "./classificationmodel";

export type { PredictionResult } from "./classificationmodel";
export { connectFaceShapeClient, predictClassification, labels, faceShapeMain };
export default faceShapeMain;
