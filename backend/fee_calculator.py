from typing import Optional

DEFAULT_BASE_FEE_BY_TYPE = {
    'Tourist': 3500,
    'Business': 4500,
    'Student': 5500,
    'Work': 7500,
    'Transit': 2500,
    'Medical': 4500,
}
DEFAULT_SURCHARGE_INR = 350
DEFAULT_GST_RATE = 0.18


def base_fee_for(visa_type: str, fallback: int = 3500) -> int:
    return DEFAULT_BASE_FEE_BY_TYPE.get(visa_type, fallback)


def compute_fees(
    applicants: int = 1,
    visa_type: str = 'Tourist',
    govt_fee_inr: int = 0,
    requires_appointment: bool = False,
    appointment_fee_inr: int = 0,
    base_fees_override: Optional[dict] = None,
    surcharge_inr: int = DEFAULT_SURCHARGE_INR,
    gst_rate: float = DEFAULT_GST_RATE,
) -> dict:
    n = max(1, applicants)
    if base_fees_override:
        base = int(base_fees_override.get(visa_type, DEFAULT_BASE_FEE_BY_TYPE.get(visa_type, 3500)))
    else:
        base = base_fee_for(visa_type)

    is_visa_free = govt_fee_inr == 0

    application = (govt_fee_inr + base) * n
    appointment = appointment_fee_inr * n if requires_appointment else 0
    surcharge = (n - 1) * surcharge_inr

    gst_on_service = round((base * n + appointment) * gst_rate)
    gst_display = gst_on_service + surcharge

    total = application + appointment + gst_display

    return {
        'govt': govt_fee_inr * n,
        'base': base * n,
        'application': application,
        'appointment': appointment,
        'requires_appointment': requires_appointment,
        'is_visa_free': is_visa_free,
        'surcharge': surcharge,
        'gst_on_service': gst_on_service,
        'gst': gst_display,
        'total': total,
        'applicants': n,
    }


async def revenue_for(app: dict, country: Optional[dict], pricing: Optional[dict] = None) -> int:
    applicants = max(1, int(app.get('applicants') or 1))
    visa_type = app.get('visa_type') or 'Tourist'

    if pricing:
        base = int(pricing['base_fees'].get(visa_type, DEFAULT_BASE_FEE_BY_TYPE.get(visa_type, 3500)))
        surcharge_inr = pricing['surcharge_inr']
        gst_rate = pricing['gst_rate']
    else:
        base = base_fee_for(visa_type)
        surcharge_inr = DEFAULT_SURCHARGE_INR
        gst_rate = DEFAULT_GST_RATE

    govt_inr = 0
    appt = 0
    requires_appointment = False
    if country:
        cats = country.get('categories') or {}
        cat = cats.get(visa_type) if isinstance(cats, dict) else None
        if isinstance(cat, dict):
            govt_inr = int(cat.get('fees_inr') or 0)
        requires_appointment = bool(country.get('requires_appointment'))
        if requires_appointment:
            appt = int(country.get('appointment_fee_inr') or 0)

    fees = compute_fees(
        applicants=applicants,
        visa_type=visa_type,
        govt_fee_inr=govt_inr,
        requires_appointment=requires_appointment,
        appointment_fee_inr=appt,
        surcharge_inr=surcharge_inr,
        gst_rate=gst_rate,
    )
    return fees['total']