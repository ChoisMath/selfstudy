import { z } from "zod";

export const demoPropsSchema = z.object({
  appName: z.string(),
  appUrl: z.string(),
});

export type DemoProps = z.infer<typeof demoPropsSchema>;

export const defaultDemoProps: DemoProps = {
  appName: "포산고 자율학습",
  appUrl: "https://self.posan.kr",
};
