import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "../docs/openapi";

export const docsRoute = Router();

docsRoute.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

docsRoute.use("/", swaggerUi.serve, swaggerUi.setup(openApiDocument));
