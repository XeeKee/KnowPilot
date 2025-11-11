"""
Load YAML Config File
"""

import os
import yaml
from dataclasses import dataclass, field
from typing import Dict, Any, Optional
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class FlaskConfig:
    """Flask application configuration"""
    static_folder: str = "front_end_re"
    static_url_path: str = "/static"
    template_folder: str = "front_end_re"


@dataclass
class AppConfig:
    """Application basic configuration"""
    name: str = "OmniThink"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 5000
    secret_key: str = "your-secret-key-here"
    permanent_session_lifetime: int = 7 * 24 * 60 * 60
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Lax"
    SESSION_COOKIE_SECURE: bool = False


@dataclass
class ModelConfig:
    """Language model configuration"""
    type: str = "VolcEngine"
    name: str = "deepseek-v3-250324"
    api_key: str = ""
    base_url: str = "https://ark.cn-beijing.volces.com/api/v3"
    max_tokens: int = 4096
    temperature: float = 0.7
    top_p: float = 0.7
    outlineType: str = "default"  


@dataclass
class SearchConfig:
    """Search configuration"""
    api_key: str = ""
    top_k: int = 5
    search_engine: str = "bing"
    debug: bool = True
    scene: str = "dolphin_search_google_nlp"
    page: int = 1
    custom_config_info: dict = field(default_factory=lambda: {
        "multiSearch": False,
        "qpMultiQuery": False,
        "qpMultiQueryHistory": [],
        "qpSpellcheck": False,
        "qpEmbedding": False,
        "knnWithScript": False,
        "qpTermsWeight": False,
        "pluginServiceConfig": {"qp": "mvp_search_qp_qwen"},
    })
    api_endpoint: str = "http://101.37.167.147/gw/v1/api/msearch-sp/qwen-search"
    max_retries: int = 5
    retry_delay: int = 2


@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = "INFO"
    file: str = "app.log"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


@dataclass
class DatabaseConfig:
    """Database configuration"""
    host: str = "localhost"
    port: int = 5432
    database: str = "collabthink_db"
    username: str = "postgres"
    password: str = ""
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    echo: bool = False


@dataclass
class Config:
    """Main configuration class"""
    flask: FlaskConfig = field(default_factory=FlaskConfig)
    app: AppConfig = field(default_factory=AppConfig)
    model: ModelConfig = field(default_factory=ModelConfig)
    search: SearchConfig = field(default_factory=SearchConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    
    def __post_init__(self):
        # 保证所有字段都不是None
        if self.flask is None:
            self.flask = FlaskConfig()
        if self.app is None:
            self.app = AppConfig()
        if self.model is None:
            self.model = ModelConfig()
        if self.search is None:
            self.search = SearchConfig()
        if self.logging is None:
            self.logging = LoggingConfig()
        if self.database is None:
            self.database = DatabaseConfig()
        self._load_environment_variables()
    
    def _load_environment_variables(self):
        """Load sensitive configuration from environment variables"""
        if self.model and not self.model.api_key:
            self.model.api_key = os.getenv('ARK_API_KEY', '')
        if self.search and not self.search.api_key:
            self.search.api_key = os.getenv('SEARCH_API_KEY', '')
        if self.app and (not self.app.secret_key or self.app.secret_key == "your-secret-key-here"):
            self.app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-here')
        
        if self.database:
            if os.getenv('DB_PASSWORD'):
                self.database.password = os.getenv('DB_PASSWORD')
            elif not self.database.password:
                self.database.password = os.getenv('DB_PASSWORD', '')
            
            if os.getenv('DB_HOST'):
                self.database.host = os.getenv('DB_HOST')
            if os.getenv('DB_PORT'):
                try:
                    self.database.port = int(os.getenv('DB_PORT'))
                except ValueError:
                    pass
            if os.getenv('DB_NAME'):
                self.database.database = os.getenv('DB_NAME')
            if os.getenv('DB_USER'):
                self.database.username = os.getenv('DB_USER')
            
            database_url = os.getenv('DATABASE_URL')
            if database_url:
                try:
                    from urllib.parse import urlparse
                    parsed = urlparse(database_url)
                    self.database.host = parsed.hostname or self.database.host
                    self.database.port = parsed.port or self.database.port
                    self.database.database = parsed.path.lstrip('/') or self.database.database
                    self.database.username = parsed.username or self.database.username
                    self.database.password = parsed.password or self.database.password
                except Exception as e:
                    logger.warning(f"Failed to parse DATABASE_URL: {e}")
            
            logger.info(f"Database config loaded: {self.database.host}:{self.database.port}/{self.database.database} (user: {self.database.username})")
    
    @classmethod
    def from_yaml(cls, config_path: str) -> 'Config':
        if Path(config_path).exists():
            try:
                with open(config_path, 'r', encoding='utf-8') as file:
                    data = yaml.safe_load(file)
                flask_config = FlaskConfig(**data.get('flask', {})) if data.get('flask') is not None else FlaskConfig()
                app_config = AppConfig(**data.get('app', {})) if data.get('app') is not None else AppConfig()
                model_config = ModelConfig(**data.get('model', {})) if data.get('model') is not None else ModelConfig()
                search_config = SearchConfig(**data.get('search', {})) if data.get('search') is not None else SearchConfig()
                logging_config = LoggingConfig(**data.get('logging', {})) if data.get('logging') is not None else LoggingConfig()
                database_config = DatabaseConfig(**data.get('database', {})) if data.get('database') is not None else DatabaseConfig()
                config = cls(
                    flask=flask_config,
                    app=app_config,
                    model=model_config,
                    search=search_config,
                    logging=logging_config,
                    database=database_config
                )
                logger.info(f"Successfully loaded configuration from {config_path}")
                return config
            except Exception as e:
                logger.error(f"Failed to load configuration file {config_path}: {e}")
                logger.info("Using default configuration")
                return cls()
        else:
            logger.warning(f"Configuration file {config_path} does not exist, using default configuration")
            return cls()
    
    def validate(self) -> bool:
        """Validate configuration validity"""
        errors = []
        
        # Validate port number
        if self.app and (self.app.port < 1 or self.app.port > 65535):
            errors.append("Application port must be between 1-65535")
        
        # Validate model configuration
        if self.model and not self.model.api_key:
            errors.append("Model API key not set")
        
        # Validate log level
        if self.logging:
            valid_log_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
            if self.logging.level.upper() not in valid_log_levels:
                errors.append(f"Log level must be one of: {', '.join(valid_log_levels)}")
        
        # Validate model parameters
        if self.model:
            if not (0 <= self.model.temperature <= 2):
                errors.append("Model temperature parameter must be between 0-2")
            
            if not (0 <= self.model.top_p <= 1):
                errors.append("Model top_p parameter must be between 0-1")
            
            if self.model.max_tokens < 1:
                errors.append("Model max tokens must be greater than 0")
        
        # Report errors
        if errors:
            logger.error("Configuration validation failed:")
            for error in errors:
                logger.error(f"  - {error}")
            return False
        
        logger.info("Configuration validation passed")
        return True
    
    def save(self, config_path: str):
        """Save configuration to YAML file"""
        try:
            config_dict = {}
            
            if self.flask:
                config_dict['flask'] = {
                    'static_folder': self.flask.static_folder,
                    'static_url_path': self.flask.static_url_path,
                    'template_folder': self.flask.template_folder
                }
            
            if self.app:
                config_dict['app'] = {
                    'name': self.app.name,
                    'debug': self.app.debug,
                    'host': self.app.host,
                    'port': self.app.port,
                    'secret_key': '${SECRET_KEY}'
                }
            
            if self.model:
                config_dict['model'] = {
                    'name': self.model.name,
                    'api_key': '${ARK_API_KEY}',
                    'base_url': self.model.base_url,
                    'max_tokens': self.model.max_tokens,
                    'temperature': self.model.temperature,
                    'top_p': self.model.top_p
                }
            
            if self.search:
                config_dict['search'] = {
                    'api_key': '${SEARCH_API_KEY}',
                    'top_k': self.search.top_k,
                    'search_engine': self.search.search_engine,
                    'debug': self.search.debug,
                    'scene': self.search.scene,
                    'page': self.search.page,
                    'custom_config_info': self.search.custom_config_info,
                    'api_endpoint': self.search.api_endpoint,
                    'max_retries': self.search.max_retries,
                    'retry_delay': self.search.retry_delay
                }
            
            if self.logging:
                config_dict['logging'] = {
                    'level': self.logging.level,
                    'file': self.logging.file,
                    'format': self.logging.format
                }
            
            with open(config_path, 'w', encoding='utf-8') as file:
                yaml.dump(config_dict, file, default_flow_style=False, allow_unicode=True)
            
            logger.info(f"Configuration saved to {config_path}")
            
        except Exception as e:
            logger.error(f"Failed to save configuration file: {e}")
    
    def create_template(self, template_path: str):
        """Create configuration template file"""
        try:
            template_config = {
                'flask': {
                    'static_folder': 'front_end_re',
                    'static_url_path': '/static',
                    'template_folder': 'front_end_re'
                },
                'app': {
                    'name': 'OmniThink',
                    'debug': False,
                    'host': '0.0.0.0',
                    'port': 5000,
                    'secret_key': '${SECRET_KEY}'
                },
                'model': {
                    'name': 'deepseek-v3-250324',
                    'api_key': '${ARK_API_KEY}',
                    'base_url': 'https://ark.cn-beijing.volces.com/api/v3',
                    'max_tokens': 4096,
                    'temperature': 0.7,
                    'top_p': 0.7
                },
                'search': {
                    'api_key': '${SEARCH_API_KEY}',
                    'top_k': 5,
                    'search_engine': 'bing',
                    'debug': True,
                    'scene': 'dolphin_search_google_nlp',
                    'page': 1,
                    'custom_config_info': {
                        "multiSearch": False,
                        "qpMultiQuery": False,
                        "qpMultiQueryHistory": [],
                        "qpSpellcheck": False,
                        "qpEmbedding": False,
                        "knnWithScript": False,
                        "qpTermsWeight": False,
                        "pluginServiceConfig": {"qp": "mvp_search_qp_qwen"},
                    },
                    'api_endpoint': 'http://101.37.167.147/gw/v1/api/msearch-sp/qwen-search',
                    'max_retries': 5,
                    'retry_delay': 2
                },
                'logging': {
                    'level': 'INFO',
                    'file': 'app.log',
                    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                }
            }
            
            with open(template_path, 'w', encoding='utf-8') as file:
                yaml.dump(template_config, file, default_flow_style=False, allow_unicode=True)
            
            logger.info(f"Configuration template created: {template_path}")
            
        except Exception as e:
            logger.error(f"Failed to create configuration template: {e}")


class ConfigManager:
    """Configuration manager"""
    
    def __init__(self, config_file: str = "config.yaml"):
        self.config_file = config_file
        self.config = Config.from_yaml(config_file)
    
    def get_flask_config(self) -> FlaskConfig:
        """Get Flask configuration"""
        return self.config.flask
    
    def get_app_config(self) -> AppConfig:
        """Get application configuration"""
        return self.config.app
    
    def get_model_config(self) -> ModelConfig:
        """Get model configuration"""
        return self.config.model
    
    def get_search_config(self) -> SearchConfig:
        """Get search configuration"""
        return self.config.search
    
    def get_logging_config(self) -> LoggingConfig:
        """Get logging configuration"""
        return self.config.logging
    
    def get_database_config(self) -> DatabaseConfig:
        """Get database configuration"""
        return self.config.database
    
    def validate(self) -> bool:
        """Validate configuration"""
        return self.config.validate()
    
    def save(self):
        """Save configuration"""
        self.config.save(self.config_file)
    
    def create_template(self):
        """Create configuration template"""
        template_path = f"{self.config_file}.template"
        self.config.create_template(template_path)
    
    def reload(self):
        """Reload configuration"""
        self.config = Config.from_yaml(self.config_file)


def load_config(config_file: str = "config.yaml") -> Config:
    """Convenience function: load configuration"""
    return Config.from_yaml(config_file)


def create_config_template(template_file: str = "config.yaml.template"):
    """Convenience function: create configuration template"""
    config = Config()
    config.create_template(template_file)


# Usage example
if __name__ == "__main__":
    # Create configuration template
    create_config_template()
    
    # Load configuration
    config = load_config("config.yaml")
    
    # Validate configuration
    if config.validate():
        print("Configuration validation passed")
        print(f"Application name: {config.app.name}")
        print(f"Application port: {config.app.port}")
        print(f"Model name: {config.model.name}")
    else:
        print("Configuration validation failed") 