import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  registerUser,
} from "../services/users-service";

export const usersRoute = Router();

usersRoute.post("/", async (req, res) => {
  const result = await registerUser({
    name: req.body?.name,
    email: req.body?.email,
    password: req.body?.password,
  });

  res.status(result.status).json(result.body);
});

usersRoute.post("/login", async (req, res) => {
  const result = await loginUser({
    email: req.body?.email,
    password: req.body?.password,
  });

  res.status(result.status).json(result.body);
});

usersRoute.get("/current", async (req, res) => {
  const result = await getCurrentUser(req.headers.authorization);

  res.status(result.status).json(result.body);
});
