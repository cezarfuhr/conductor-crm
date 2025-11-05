"""
Enrichment Service - Clearbit integration for lead/company enrichment
"""

import httpx
from typing import Optional, Dict, Any
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class EnrichmentService:
    """Service for enriching lead and company data using Clearbit"""

    def __init__(self):
        self.api_key = settings.CLEARBIT_API_KEY
        self.base_url = "https://person-stream.clearbit.com/v2"
        self.company_url = "https://company-stream.clearbit.com/v2"

    async def enrich_person(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Enrich person data using Clearbit Person API

        Args:
            email: Person's email address

        Returns:
            Dict with enriched person data or None if not found
        """

        if not self.api_key:
            logger.warning("Clearbit API key not configured")
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/combined/find",
                    params={"email": email},
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    timeout=10.0
                )

                if response.status_code == 200:
                    data = response.json()
                    return self._parse_person_data(data)
                elif response.status_code == 404:
                    logger.info(f"No enrichment data found for {email}")
                    return None
                else:
                    logger.error(f"Clearbit API error: {response.status_code}")
                    return None

        except httpx.TimeoutException:
            logger.error(f"Clearbit API timeout for {email}")
            return None
        except Exception as e:
            logger.error(f"Enrichment error: {str(e)}")
            return None

    async def enrich_company(self, domain: str) -> Optional[Dict[str, Any]]:
        """
        Enrich company data using Clearbit Company API

        Args:
            domain: Company domain (e.g., "acme.com")

        Returns:
            Dict with enriched company data or None if not found
        """

        if not self.api_key:
            logger.warning("Clearbit API key not configured")
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.company_url}/companies/find",
                    params={"domain": domain},
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    timeout=10.0
                )

                if response.status_code == 200:
                    data = response.json()
                    return self._parse_company_data(data)
                elif response.status_code == 404:
                    logger.info(f"No company data found for {domain}")
                    return None
                else:
                    logger.error(f"Clearbit API error: {response.status_code}")
                    return None

        except httpx.TimeoutException:
            logger.error(f"Clearbit API timeout for {domain}")
            return None
        except Exception as e:
            logger.error(f"Enrichment error: {str(e)}")
            return None

    def _parse_person_data(self, data: Dict) -> Dict[str, Any]:
        """Parse Clearbit person response"""

        person = data.get("person", {})
        company = data.get("company", {})

        return {
            "person": {
                "name": person.get("name", {}).get("fullName"),
                "first_name": person.get("name", {}).get("givenName"),
                "last_name": person.get("name", {}).get("familyName"),
                "title": person.get("employment", {}).get("title"),
                "role": person.get("employment", {}).get("role"),
                "seniority": person.get("employment", {}).get("seniority"),
                "linkedin": person.get("linkedin", {}).get("handle"),
                "twitter": person.get("twitter", {}).get("handle"),
                "location": person.get("geo", {}).get("city"),
                "country": person.get("geo", {}).get("country")
            },
            "company": {
                "name": company.get("name"),
                "domain": company.get("domain"),
                "industry": company.get("category", {}).get("industry"),
                "sector": company.get("category", {}).get("sector"),
                "size": self._get_company_size(company.get("metrics", {}).get("employees")),
                "founded": company.get("foundedYear"),
                "revenue": company.get("metrics", {}).get("estimatedAnnualRevenue"),
                "description": company.get("description"),
                "logo": company.get("logo"),
                "location": company.get("geo", {}).get("city"),
                "country": company.get("geo", {}).get("country"),
                "tech_stack": company.get("tech", [])
            }
        }

    def _parse_company_data(self, data: Dict) -> Dict[str, Any]:
        """Parse Clearbit company response"""

        return {
            "name": data.get("name"),
            "domain": data.get("domain"),
            "industry": data.get("category", {}).get("industry"),
            "sector": data.get("category", {}).get("sector"),
            "size": self._get_company_size(data.get("metrics", {}).get("employees")),
            "employees": data.get("metrics", {}).get("employees"),
            "founded": data.get("foundedYear"),
            "revenue": data.get("metrics", {}).get("estimatedAnnualRevenue"),
            "description": data.get("description"),
            "logo": data.get("logo"),
            "location": data.get("geo", {}).get("city"),
            "state": data.get("geo", {}).get("state"),
            "country": data.get("geo", {}).get("country"),
            "phone": data.get("phone"),
            "tech_stack": data.get("tech", []),
            "tags": data.get("tags", [])
        }

    def _get_company_size(self, employees: Optional[int]) -> str:
        """Categorize company size"""
        if not employees:
            return "unknown"
        elif employees < 50:
            return "small"
        elif employees < 200:
            return "medium"
        elif employees < 1000:
            return "large"
        else:
            return "enterprise"
