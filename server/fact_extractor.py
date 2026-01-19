"""
LLM-based fact extraction and date normalization for legal documents.
"""
import json
from typing import List, Dict, Any
from datetime import datetime


def extract_facts_from_text(text: str, llm_invoke_function) -> List[Dict[str, Any]]:
    """
    Use LLM to extract structured facts from document text.
    
    Args:
        text: Extracted document text
        llm_invoke_function: The invokeLLM function from server/_core/llm
        
    Returns:
        List of extracted facts with normalized dates
    """
    
    system_prompt = """You are a legal document analysis expert. Extract key facts, events, and dates from legal documents.

For each fact you identify, extract:
1. Date (in any format mentioned in the document)
2. Event summary (1-2 sentences describing what happened)
3. Actor (person, company, or entity involved)
4. Issue (legal issue category, e.g., "Contract Dispute", "Discovery", "Motion Filed")
5. Citation (any legal citation mentioned, if present)
6. Full context (the complete relevant text from the document)

Return ONLY valid JSON with no additional text. Format:
{
  "facts": [
    {
      "date": "original date string from document",
      "summary": "brief 1-2 sentence summary",
      "actor": "person or entity name",
      "issue": "legal issue category",
      "citation": "legal citation or null",
      "full_text": "complete relevant text from document"
    }
  ]
}

If no facts are found, return: {"facts": []}"""

    user_prompt = f"""Extract all facts, events, and dates from this legal document:

{text[:15000]}"""  # Limit to first 15k chars to avoid token limits

    try:
        response = llm_invoke_function({
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "fact_extraction",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "facts": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "date": {"type": "string"},
                                        "summary": {"type": "string"},
                                        "actor": {"type": ["string", "null"]},
                                        "issue": {"type": ["string", "null"]},
                                        "citation": {"type": ["string", "null"]},
                                        "full_text": {"type": "string"}
                                    },
                                    "required": ["date", "summary", "full_text"],
                                    "additionalProperties": False
                                }
                            }
                        },
                        "required": ["facts"],
                        "additionalProperties": False
                    }
                }
            }
        })
        
        content = response["choices"][0]["message"]["content"]
        result = json.loads(content)
        
        # Normalize dates for each fact
        facts = result.get("facts", [])
        for fact in facts:
            fact["normalized_date"] = normalize_date(fact["date"])
            fact["original_date"] = fact["date"]
        
        return facts
        
    except Exception as e:
        print(f"LLM extraction error: {str(e)}")
        return []


def normalize_date(date_string: str) -> str:
    """
    Normalize various date formats to ISO 8601 (YYYY-MM-DD).
    
    Examples:
        "Jan 5th, '23" -> "2023-01-05"
        "January 5, 2023" -> "2023-01-05"
        "1/5/2023" -> "2023-01-05"
        "2023-01-05" -> "2023-01-05"
    """
    date_string = date_string.strip()
    
    # Common date format patterns to try
    formats = [
        "%Y-%m-%d",           # 2023-01-05
        "%m/%d/%Y",           # 1/5/2023
        "%m-%d-%Y",           # 1-5-2023
        "%d/%m/%Y",           # 5/1/2023
        "%B %d, %Y",          # January 5, 2023
        "%b %d, %Y",          # Jan 5, 2023
        "%B %d %Y",           # January 5 2023
        "%b %d %Y",           # Jan 5 2023
        "%d %B %Y",           # 5 January 2023
        "%d %b %Y",           # 5 Jan 2023
        "%Y/%m/%d",           # 2023/01/05
        "%m/%d/%y",           # 1/5/23
        "%b %d, '%y",         # Jan 5, '23
        "%B %d, '%y",         # January 5, '23
    ]
    
    # Remove ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)
    import re
    cleaned = re.sub(r'(\d+)(st|nd|rd|th)', r'\1', date_string)
    
    for fmt in formats:
        try:
            dt = datetime.strptime(cleaned, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    # If no format matches, try to extract year-month-day with regex
    match = re.search(r'(\d{4})-(\d{1,2})-(\d{1,2})', date_string)
    if match:
        year, month, day = match.groups()
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    
    # Last resort: return original string
    return date_string
