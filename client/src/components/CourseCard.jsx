import { 
  VariantAFlag, 
  VariantBStrip, 
  VariantCChip 
} from './prototypes/RequirementFlagVariants';

function CourseCard({ 
    course,
    code: propCode, 
    name: propName, 
    credits: propCredits, 
    description: propDescription, 
    isTransfer: propIsTransfer, 
    institution: propInstitution, 
    satisfiesCourse: propSatisfiesCourse, 
    validation: propValidation,
    variant: propVariant,
    onInspectRequirement,
    onSelectCourse, 
    onClickCourse 
}) {
    const code = course?.code ?? propCode;
    const name = course?.name ?? propName;
    const credits = course?.credits ?? propCredits;
    const description = course?.description ?? propDescription;
    const isTransfer = course?.isTransfer ?? propIsTransfer;
    const institution = course?.institution ?? propInstitution;
    const satisfiesCourse = course?.satisfiesCourse ?? propSatisfiesCourse;
    const validation = course?.validation ?? propValidation;
    const variant = course?.variant ?? propVariant ?? 'A';

    const courseObj = course || { name, code, credits, description, isTransfer, institution, satisfiesCourse, validation };

    let cardExtraClass = '';
    if (validation?.hasFlag) {
        if (validation.overallStatus === 'UNSATISFIED') {
            cardExtraClass = ' has-unsatisfied-req';
        } else if (validation.overallStatus === 'WAIVED') {
            cardExtraClass = ' has-waived-req';
        }
    }

    return (
        <div 
            className={`course ${onClickCourse ? 'clickable' : ''}${cardExtraClass}`}
            onClick={onClickCourse ? () => onClickCourse(courseObj) : undefined}
        >
            {variant === 'B' && <VariantBStrip validation={validation} />}

            <div className="courseHeader">
                <h1 className="name">{name}</h1>
                {isTransfer && <span className="transferBadge">Transfer</span>}
                {variant === 'A' && <VariantAFlag validation={validation} />}
                {variant === 'C' && (
                    <VariantCChip 
                        validation={validation} 
                        course={courseObj} 
                        onInspect={onInspectRequirement} 
                    />
                )}
            </div>
            <h3 className="code">{code}</h3>
            <p className="credits">Credits: {credits}</p>
            {satisfiesCourse && <p className="satisfiesCourse"><strong>Satisfies:</strong> {satisfiesCourse}</p>}
            <p className="description">{description}</p>
            {/* Will only be there when its in available courses */}
            {onSelectCourse && (
                <button 
                    className="addCourse" 
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectCourse(courseObj);
                    }}
                >
                    Add Course to Schedule
                </button>
            )}
        </div>
    )
}

export default CourseCard;
