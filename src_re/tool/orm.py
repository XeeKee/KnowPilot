from typing import Union, List
import json
import requests
import logging
import time
import uuid
from .config_manager import Config

class AliGoogleSearch:
    def __init__(self, config: Config):
        search_cfg = config.search
        self.usage = 0
        self.api_key = search_cfg.api_key
        self.k = search_cfg.top_k
        self.debug = search_cfg.debug
        self.scene = search_cfg.scene
        self.page = search_cfg.page
        self.custom_config_info = search_cfg.custom_config_info
        self.api_endpoint = search_cfg.api_endpoint
        self.max_retries = search_cfg.max_retries
        self.retry_delay = search_cfg.retry_delay
        self.template = {
            "rid": str(uuid.uuid4()),
            "scene": self.scene,
            "uq": "",
            "debug": self.debug,
            "fields": [],
            "page": self.page,
            "rows": self.k,
            "customConfigInfo": self.custom_config_info,
            "headers": {"__d_head_qto": 5000},
        }

    def __call__(self, query_or_queries: Union[str, List[str]], **kwargs) -> List[dict]:
        queries = (
            [query_or_queries]
            if isinstance(query_or_queries, str)
            else query_or_queries
        )
        self.usage += len(queries)

        collected_results = []
        for query in queries:
            attempt = 0
            while attempt < self.max_retries:
                attempt += 1
                try:
                    self.template["uq"] = query
                    headers = {
                        "Content-Type": "application/json",
                        "Accept-Encoding": "utf-8",
                        "Authorization": f"Bearer {self.api_key}",
                    }
                    response = requests.post(
                        self.api_endpoint,
                        data=json.dumps(self.template),
                        headers=headers,
                    )
                    response.raise_for_status()
                    response_data = response.json()
                    # Process search results
                    search_results = response_data['data']['docs']
                    print(len(search_results))
                    for result in search_results:
                        collected_results.append({
                            'url': result['url'],
                            'title': result['title'],
                            'description': result.get('snippet', ''),
                            'snippets': [result.get('snippet', '')]
                        })
                    break  # Successfully get results, exit retry loop
                except requests.exceptions.RequestException as e:
                    logging.error(f'Attempt {attempt} failed for query "{query}": {e}')
                    if attempt < self.max_retries:
                        time.sleep(self.retry_delay)
                except Exception as e:
                    logging.error(f'Unexpected error for query "{query}": {e}')
                    break  # Non-network error, exit retry loop
        return collected_results