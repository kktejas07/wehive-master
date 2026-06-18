"""Tool Registry — formal tool definitions for the AI agent system.

Each tool has a name, description, parameter schema, and handler.
Used by the ReAct agent loop to decide which tool to call.
"""

from typing import Any, Callable, Dict, List, Optional


class Tool:
    def __init__(self, name: str, description: str, parameters: dict, handler: Callable):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.handler = handler

    def to_dict(self) -> dict:
        return {
            'name': self.name,
            'description': self.description,
            'parameters': self.parameters,
        }


# Tool instances point to the actual async handlers
# These are populated at import time with the correct references
_tools: Dict[str, Tool] = {}


def register_tool(name: str, description: str, parameters: dict, handler: Callable) -> Tool:
    tool = Tool(name, description, parameters, handler)
    _tools[name] = tool
    return tool


def get_tool(name: str) -> Optional[Tool]:
    return _tools.get(name)


def list_tools() -> List[Tool]:
    return list(_tools.values())


def tool_definitions() -> List[dict]:
    return [t.to_dict() for t in _tools.values()]


# Tools are registered in register_all() below
def register_all():
    from eva_tools import lookup_country, search_countries, lookup_university, search_universities, get_visa_requirements, get_application_fee

    register_tool(
        'lookup_country',
        'Look up visa and country information by country code (e.g. us, uk, ca, au)',
        {
            'type': 'object',
            'properties': {
                'country_id': {'type': 'string', 'description': 'Two-letter country code'}
            },
            'required': ['country_id'],
        },
        lookup_country,
    )

    register_tool(
        'search_countries',
        'Search countries by name or visa type',
        {
            'type': 'object',
            'properties': {
                'query': {'type': 'string', 'description': 'Search query for country name or visa type'}
            },
            'required': ['query'],
        },
        search_countries,
    )

    register_tool(
        'search_universities',
        'Search universities by country and/or course',
        {
            'type': 'object',
            'properties': {
                'country': {'type': 'string', 'description': 'Two-letter country code'},
                'course': {'type': 'string', 'description': 'Course category (e.g. stem, business, medicine)'},
            },
        },
        search_universities,
    )

    register_tool(
        'get_visa_requirements',
        'Get visa requirements including documents, fees, and processing times for a country',
        {
            'type': 'object',
            'properties': {
                'country_id': {'type': 'string', 'description': 'Two-letter country code'},
                'visa_type': {'type': 'string', 'description': 'Optional visa type filter (e.g. tourist, student, business)'},
            },
            'required': ['country_id'],
        },
        get_visa_requirements,
    )

    register_tool(
        'get_application_fee',
        'Get visa application fees for a country in INR',
        {
            'type': 'object',
            'properties': {
                'country_id': {'type': 'string', 'description': 'Two-letter country code'}
            },
            'required': ['country_id'],
        },
        get_application_fee,
    )
