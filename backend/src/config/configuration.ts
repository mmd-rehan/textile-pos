export interface AppConfig {
  env: string;
  port: number;
  database: {
    url: string;
  };
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  database: {
    url: process.env.DATABASE_URL || '',
  },
});
