//the schema used by the LLM to limit it's prompting into exactly this
export type EyeSchema = {
  //actually, all of them CAN be null
  ro: number;
  dia: number;
  sphere: number;
  cyl?: number;
  axe?: number;
};

export type ResponseSchema = {
  status: 'ok' | 'invalid_document' | 'parse_failed';
  left_eye?: EyeSchema;
  right_eye?: EyeSchema;
};
