import faceShapeMain, {
  connectFaceShapeClient,
  predictClassification,
  labels,
} from "./classifcationmodel";

export type { PredictionResult } from "./classifcationmodel";
export { connectFaceShapeClient, predictClassification, labels, faceShapeMain };
export default faceShapeMain;

if (require.main === module) {
  console.log("Face shape classification module ready.");
}

