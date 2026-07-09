from core.ink_brush import InkBrush
from core.ink_field import InkField


def test_ink_brush_apply_and_field_update() -> None:
    field = InkField(128, 128)
    brush = InkBrush(field)

    # Before drawing, field should be empty.
    assert field.field.max() == 0.0

    # Apply a single brush stroke at the center and ensure ink is injected.
    brush.apply(64, 64, speed=2.0, params={
        "brush_size": 8.0,
        "ink_density": 0.9,
        "direction": 0.0,
        "aspect_ratio": 1.0,
        "wetness": 0.6,
    })

    assert field.field.max() > 0.0
    assert field.persistence.max() > 0.0

    # Update the field and ensure values remain bounded.
    field.update()
    assert field.field.min() >= 0.0
    assert field.field.max() <= 1.0
