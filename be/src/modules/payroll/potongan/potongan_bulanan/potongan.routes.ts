import { Router } from "express";
import { upsertPotongan, getPotonganDetail } from "./potongan.controller";

const router = Router();

router.post("/", upsertPotongan);
router.get("/", getPotonganDetail);

export default router;
