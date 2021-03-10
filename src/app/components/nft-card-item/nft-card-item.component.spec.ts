import { ComponentFixture, TestBed } from '@angular/core/testing'

import { ColorCardItemComponent } from './nft-card-item.component'

describe('ColorCardItemComponent', () => {
  let component: ColorCardItemComponent
  let fixture: ComponentFixture<ColorCardItemComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ColorCardItemComponent],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(ColorCardItemComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
